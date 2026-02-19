import { Handler } from '@netlify/functions'

const NOTIFICATION_EMAIL = 'madhu.gumballi@gmail.com'

const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { userId, displayName, rating, comment } = body

    if (!rating || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      }
    }

    const ratingEmojis = ['', '😕', '🙂', '😊', '🤩']
    const ratingLabels = ['', 'Not great', 'Okay', 'Good', 'Amazing']
    const emoji = ratingEmojis[rating] || ''
    const label = ratingLabels[rating] || ''

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const emailHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
          <h2 style="color: #f59e0b; margin-top: 0;">New Feedback on Avabodhak</h2>
          <div style="font-size: 48px; text-align: center; padding: 16px 0;">${emoji}</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 100px;">Rating</td>
              <td style="padding: 8px 0; font-weight: bold;">${emoji} ${label} (${rating}/4)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">User</td>
              <td style="padding: 8px 0;">${displayName || 'Anonymous'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">User ID</td>
              <td style="padding: 8px 0; font-size: 12px; color: #64748b;">${userId}</td>
            </tr>
            ${comment ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Comment</td>
              <td style="padding: 8px 0;">${escapeHtml(comment)}</td>
            </tr>
            ` : ''}
          </table>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 16px 0;" />
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
            Sent from Avabodhak Feedback · ${new Date().toISOString()}
          </p>
        </div>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Avabodhak <onboarding@resend.dev>',
          to: [NOTIFICATION_EMAIL],
          subject: `${emoji} Avabodhak Feedback: ${label} (${rating}/4) from ${displayName || 'User'}`,
          html: emailHtml,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Resend email error:', res.status, errText)
      } else {
        console.log('Feedback email sent to', NOTIFICATION_EMAIL)
      }
    } else {
      console.warn('RESEND_API_KEY not set — skipping email notification')
      // Log feedback to function logs as fallback
      console.log('FEEDBACK:', JSON.stringify({ displayName, rating, label, comment, userId }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    }
  } catch (error) {
    console.error('Feedback function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { handler }
