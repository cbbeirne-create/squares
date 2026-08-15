import type { SportTemplate } from '@/types'

interface PitchOptions {
  width:  number
  height: number
  sport:  SportTemplate
  lineColor?: string
  lineWidth?: number
}

export function drawPitch(
  canvas: HTMLCanvasElement,
  opts: PitchOptions
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width: w, height: h, sport } = opts
  const lc = opts.lineColor ?? 'rgba(255,255,255,0.45)'
  const lw = opts.lineWidth ?? 1

  canvas.width  = w
  canvas.height = h
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = lc
  ctx.lineWidth   = lw

  switch (sport) {
    case 'rugby':  drawRugby(ctx, w, h, lc, lw);  break
    case 'gaa':    drawGAA(ctx, w, h, lc, lw);    break
    case 'soccer': drawSoccer(ctx, w, h, lc, lw); break
  }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.strokeRect(x, y, w, h)
}
function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
}
function dot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r = 3) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = ctx.strokeStyle as string; ctx.fill()
}

// ── Rugby Union (100m × 70m) ──────────────────────────────────────────────
function drawRugby(ctx: CanvasRenderingContext2D, w: number, h: number, lc: string, lw: number) {
  const pad = { x: w * 0.05, y: h * 0.05 }
  const fw = w - pad.x * 2, fh = h - pad.y * 2

  // Outer boundary
  rect(ctx, pad.x, pad.y, fw, fh)

  // 22m lines (22% from each end of 100m = 22/100)
  const v22 = fw * 0.22
  line(ctx, pad.x + v22, pad.y, pad.x + v22, pad.y + fh)
  line(ctx, pad.x + fw - v22, pad.y, pad.x + fw - v22, pad.y + fh)

  // Halfway
  line(ctx, pad.x + fw / 2, pad.y, pad.x + fw / 2, pad.y + fh)

  // 10m lines
  const v10 = fw * 0.10
  ctx.setLineDash([4, 4])
  line(ctx, pad.x + v10, pad.y, pad.x + v10, pad.y + fh)
  line(ctx, pad.x + fw - v10, pad.y, pad.x + fw - v10, pad.y + fh)
  ctx.setLineDash([])

  // Centre circle
  circle(ctx, pad.x + fw / 2, pad.y + fh / 2, Math.min(fw, fh) * 0.07)
  dot(ctx, pad.x + fw / 2, pad.y + fh / 2)

  // Try lines (in-goal 5% each end)
  const ig = fw * 0.05
  ctx.globalAlpha = 0.6
  line(ctx, pad.x + ig, pad.y, pad.x + ig, pad.y + fh)
  line(ctx, pad.x + fw - ig, pad.y, pad.x + fw - ig, pad.y + fh)
  ctx.globalAlpha = 1

  // Goal posts (5m from try line, centred)
  const gpW = fw * 0.04, gpH = fh * 0.20
  const gpY = pad.y + (fh - gpH) / 2
  // Left
  line(ctx, pad.x + ig + fw * 0.01, gpY, pad.x + ig + fw * 0.01, gpY + gpH)
  line(ctx, pad.x + ig + fw * 0.01 - gpW / 2, gpY, pad.x + ig + fw * 0.01 + gpW / 2, gpY)
  // Right
  line(ctx, pad.x + fw - ig - fw * 0.01, gpY, pad.x + fw - ig - fw * 0.01, gpY + gpH)
  line(ctx, pad.x + fw - ig - fw * 0.01 - gpW / 2, gpY, pad.x + fw - ig - fw * 0.01 + gpW / 2, gpY)
}

// ── GAA (137m × 82m) ──────────────────────────────────────────────────────
function drawGAA(ctx: CanvasRenderingContext2D, w: number, h: number, lc: string, lw: number) {
  const pad = { x: w * 0.05, y: h * 0.05 }
  const fw = w - pad.x * 2, fh = h - pad.y * 2

  // Outer
  rect(ctx, pad.x, pad.y, fw, fh)

  // Halfway
  line(ctx, pad.x + fw / 2, pad.y, pad.x + fw / 2, pad.y + fh)

  // 45m lines (45/137 ≈ 0.328)
  const v45 = fw * 0.328
  line(ctx, pad.x + v45, pad.y, pad.x + v45, pad.y + fh)
  line(ctx, pad.x + fw - v45, pad.y, pad.x + fw - v45, pad.y + fh)

  // 65m lines (65/137 ≈ 0.474)
  ctx.setLineDash([4, 4])
  const v65 = fw * 0.474
  line(ctx, pad.x + v65, pad.y, pad.x + v65, pad.y + fh)
  line(ctx, pad.x + fw - v65, pad.y, pad.x + fw - v65, pad.y + fh)
  ctx.setLineDash([])

  // 20m line (20/137 ≈ 0.146)
  const v20 = fw * 0.146
  line(ctx, pad.x + v20, pad.y, pad.x + v20, pad.y + fh)
  line(ctx, pad.x + fw - v20, pad.y, pad.x + fw - v20, pad.y + fh)

  // Centre circle
  circle(ctx, pad.x + fw / 2, pad.y + fh / 2, Math.min(fw, fh) * 0.07)
  dot(ctx, pad.x + fw / 2, pad.y + fh / 2)

  // Large square (14m × 45m → 14/137, 45/82)
  const lsW = fw * (14 / 137), lsH = fh * (45 / 82)
  const lsY = pad.y + (fh - lsH) / 2
  rect(ctx, pad.x, lsY, lsW, lsH)
  rect(ctx, pad.x + fw - lsW, lsY, lsW, lsH)

  // Small square (5m × 21m → 5/137, 21/82)
  const ssW = fw * (5 / 137), ssH = fh * (21 / 82)
  const ssY = pad.y + (fh - ssH) / 2
  rect(ctx, pad.x, ssY, ssW, ssH)
  rect(ctx, pad.x + fw - ssW, ssY, ssW, ssH)

  // Goal posts
  const gpW = fw * 0.025, gpH = fh * 0.18
  const gpY = pad.y + (fh - gpH) / 2
  line(ctx, pad.x + fw * 0.005, gpY, pad.x + fw * 0.005, gpY + gpH)
  line(ctx, pad.x + fw * 0.005 - gpW / 2, gpY, pad.x + fw * 0.005 + gpW / 2, gpY)
  line(ctx, pad.x + fw - fw * 0.005, gpY, pad.x + fw - fw * 0.005, gpY + gpH)
  line(ctx, pad.x + fw - fw * 0.005 - gpW / 2, gpY, pad.x + fw - fw * 0.005 + gpW / 2, gpY)
}

// ── Soccer (105m × 68m) ───────────────────────────────────────────────────
function drawSoccer(ctx: CanvasRenderingContext2D, w: number, h: number, lc: string, lw: number) {
  const pad = { x: w * 0.05, y: h * 0.05 }
  const fw = w - pad.x * 2, fh = h - pad.y * 2

  // Outer
  rect(ctx, pad.x, pad.y, fw, fh)

  // Halfway
  line(ctx, pad.x + fw / 2, pad.y, pad.x + fw / 2, pad.y + fh)

  // Centre circle (9.15m radius → 9.15/68 of height)
  const ccR = fh * (9.15 / 68)
  circle(ctx, pad.x + fw / 2, pad.y + fh / 2, ccR)
  dot(ctx, pad.x + fw / 2, pad.y + fh / 2)

  // Penalty areas (16.5m × 40.32m → 16.5/105, 40.32/68)
  const paW = fw * (16.5 / 105), paH = fh * (40.32 / 68)
  const paY = pad.y + (fh - paH) / 2
  rect(ctx, pad.x, paY, paW, paH)
  rect(ctx, pad.x + fw - paW, paY, paW, paH)

  // Goal areas (5.5m × 18.32m → 5.5/105, 18.32/68)
  const gaW = fw * (5.5 / 105), gaH = fh * (18.32 / 68)
  const gaY = pad.y + (fh - gaH) / 2
  rect(ctx, pad.x, gaY, gaW, gaH)
  rect(ctx, pad.x + fw - gaW, gaY, gaW, gaH)

  // Penalty spots (11m from goal line → 11/105)
  const psX = fw * (11 / 105)
  dot(ctx, pad.x + psX, pad.y + fh / 2)
  dot(ctx, pad.x + fw - psX, pad.y + fh / 2)

  // Penalty arcs
  ctx.beginPath()
  ctx.arc(pad.x + psX, pad.y + fh / 2, ccR, -Math.PI * 0.72, Math.PI * 0.72)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(pad.x + fw - psX, pad.y + fh / 2, ccR, Math.PI * 0.28, Math.PI * 1.72)
  ctx.stroke()

  // Corner arcs (1m radius → 1/68 of height)
  const cr = fh * (1 / 68)
  const corners = [
    [pad.x, pad.y, 0, Math.PI / 2],
    [pad.x + fw, pad.y, Math.PI / 2, Math.PI],
    [pad.x + fw, pad.y + fh, Math.PI, Math.PI * 1.5],
    [pad.x, pad.y + fh, Math.PI * 1.5, Math.PI * 2],
  ] as const
  corners.forEach(([cx, cy, start, end]) => {
    ctx.beginPath(); ctx.arc(cx, cy, cr, start, end); ctx.stroke()
  })

  // Goals
  const gW = fw * 0.02, gH = fh * (7.32 / 68)
  const gY = pad.y + (fh - gH) / 2
  ctx.globalAlpha = 0.5
  rect(ctx, pad.x - gW, gY, gW, gH)
  rect(ctx, pad.x + fw, gY, gW, gH)
  ctx.globalAlpha = 1
}
