import { Handler } from '@netlify/functions'

const handler: Handler = async (event) => {
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
    const { stotraKey, lineId, lineText, issueType, description, suggestedText, reference } = body

    if (!stotraKey || !issueType || !description) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      }
    }

    const issueEmojis: Record<string, string> = {
      doubt: '🤔',
      variant: '🔀',
      error: '⚠️',
    }
    const emoji = issueEmojis[issueType] || '📝'

    // Read verifier emails from env
    const verifierEmails = (process.env.VERIFIER_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    const resendKey = process.env.RESEND_API_KEY

    if (resendKey && verifierEmails.length > 0) {
      const emailHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
          <h2 style="color: #f59e0b; margin-top: 0;">${emoji} New Text Issue Report</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 130px;">Stotra</td>
              <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(stotraKey)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Line ID</td>
              <td style="padding: 8px 0;">${escapeHtml(lineId || '—')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Issue Type</td>
              <td style="padding: 8px 0;">${emoji} ${escapeHtml(issueType)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Line Text</td>
              <td style="padding: 8px 0; font-size: 13px; color: #cbd5e1;">${escapeHtml(lineText || '—')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Description</td>
              <td style="padding: 8px 0;">${escapeHtml(description)}</td>
            </tr>
            ${suggestedText ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Suggested Text</td>
              <td style="padding: 8px 0; font-style: italic;">${escapeHtml(suggestedText)}</td>
            </tr>
            ` : ''}
            ${reference ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Reference</td>
              <td style="padding: 8px 0;">${escapeHtml(reference)}</td>
            </tr>
            ` : ''}
          </table>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 16px 0;" />
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
            Sent from Avabodhak Text Issue Reporter · ${new Date().toISOString()}
          </p>
        </div>
      `

      const subject = `[TEXT ISSUE] ${stotraKey} · ${lineId || 'stotra-level'} · ${issueType}`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Avabodhak <onboarding@resend.dev>',
          to: verifierEmails,
          subject,
          html: emailHtml,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Resend email error:', res.status, errText)
      } else {
        console.log('Text issue email sent to', verifierEmails.join(', '))
      }
    } else {
      if (!resendKey) console.warn('RESEND_API_KEY not set — skipping email notification')
      if (verifierEmails.length === 0) console.warn('VERIFIER_EMAILS not set — skipping email notification')
      console.log('TEXT ISSUE:', JSON.stringify({ stotraKey, lineId, issueType, description }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    }
  } catch (error) {
    console.error('Text issue function error:', error)
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
