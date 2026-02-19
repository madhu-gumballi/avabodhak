/**
 * Canvas-based achievement card image generator
 * Generates a 1080x1080 shareable card with dark gradient, gold accents, and branding
 */

interface AchievementCardOptions {
  achievementIcon: string
  achievementName: string
  achievementDescription: string
  userName?: string
  unlockedDate?: string
}

/**
 * Generate a shareable achievement card as a PNG Blob
 */
export async function generateAchievementCard(options: AchievementCardOptions): Promise<Blob> {
  const { achievementIcon, achievementName, achievementDescription, userName, unlockedDate } = options

  const size = 1080
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // --- Background gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, size)
  bgGrad.addColorStop(0, '#0f172a')
  bgGrad.addColorStop(1, '#1e293b')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, size, size)

  // --- Gold border ---
  const borderWidth = 6
  const borderRadius = 40
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
  ctx.lineWidth = borderWidth
  roundRect(ctx, borderWidth / 2, borderWidth / 2, size - borderWidth, size - borderWidth, borderRadius)
  ctx.stroke()

  // --- Inner subtle border ---
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)'
  ctx.lineWidth = 1
  roundRect(ctx, 24, 24, size - 48, size - 48, 28)
  ctx.stroke()

  // --- Ambient glow behind icon ---
  const glowGrad = ctx.createRadialGradient(size / 2, 380, 0, size / 2, 380, 200)
  glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)')
  glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 180, size, 400)

  // --- "Achievement Unlocked" header ---
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(245, 158, 11, 0.8)'
  ctx.font = '600 28px system-ui, -apple-system, sans-serif'
  ctx.letterSpacing = '4px'
  ctx.fillText('ACHIEVEMENT UNLOCKED', size / 2, 180)

  // --- Achievement icon (emoji) ---
  ctx.font = '160px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = 'white'
  ctx.fillText(achievementIcon, size / 2, 420)

  // --- Achievement name ---
  ctx.fillStyle = 'rgb(245, 158, 11)'
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif'
  ctx.letterSpacing = '0px'
  wrapText(ctx, achievementName, size / 2, 530, size - 120, 62)

  // --- Achievement description ---
  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)'
  ctx.font = '32px system-ui, -apple-system, sans-serif'
  wrapText(ctx, achievementDescription, size / 2, 620, size - 160, 42)

  // --- User name ---
  if (userName) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '28px system-ui, -apple-system, sans-serif'
    ctx.fillText(userName, size / 2, 780)
  }

  // --- Unlocked date ---
  if (unlockedDate) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
    ctx.font = '24px system-ui, -apple-system, sans-serif'
    ctx.fillText(unlockedDate, size / 2, 820)
  }

  // --- Decorative line ---
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(size / 2 - 150, 870)
  ctx.lineTo(size / 2 + 150, 870)
  ctx.stroke()

  // --- Branding footer ---
  ctx.fillStyle = 'rgba(245, 158, 11, 0.6)'
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
  ctx.fillText('Avabodhak', size / 2, 940)

  ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'
  ctx.font = '24px system-ui, -apple-system, sans-serif'
  ctx.fillText('avabodhak.app', size / 2, 980)

  // --- Corner decorations ---
  drawCornerAccent(ctx, 50, 50, 1, 1)
  drawCornerAccent(ctx, size - 50, 50, -1, 1)
  drawCornerAccent(ctx, 50, size - 50, 1, -1)
  drawCornerAccent(ctx, size - 50, size - 50, -1, -1)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate card image'))
      },
      'image/png',
      1.0
    )
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = word
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, currentY)
}

function drawCornerAccent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number
) {
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y + dy * 30)
  ctx.lineTo(x, y)
  ctx.lineTo(x + dx * 30, y)
  ctx.stroke()
}
