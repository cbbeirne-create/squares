import { Resend } from 'resend'
import type { EmailPayload } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY!)

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeUrl(value?: string): string {
  if (!value) return '#'
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? escapeHtml(url.toString()) : '#'
  } catch {
    return '#'
  }
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const { subject, html } = buildEmail(payload)
    const result = await resend.emails.send({
      from: `${payload.clubName} <noreply@stadiumsquares.io>`,
      to: payload.to,
      subject,
      html,
    })
    if (result.error) throw new Error(result.error.message)
    return true
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  const club = escapeHtml(payload.clubName)
  const fan = escapeHtml(payload.fanName)
  const ref = escapeHtml(payload.gridRef)
  const message = payload.fanMessage ? escapeHtml(payload.fanMessage) : ''
  const note = payload.rejectionNote ? escapeHtml(payload.rejectionNote) : ''
  const link = safeUrl(payload.boardUrl)

  switch (payload.type) {
    case 'purchase_confirmation':
      return {
        subject: `Your ${payload.clubName} payment is confirmed — ${payload.gridRef}`,
        html: emailWrapper(club, `
          <h2>Thanks, ${fan}!</h2>
          <p>Stripe has confirmed payment for square <strong>${ref}</strong>.</p>
          ${message ? `<blockquote>${message}</blockquote>` : ''}
          <p>Your tribute is now with the ${club} team for review.</p>
        `),
      }
    case 'square_approved':
    case 'resubmission_approved':
      return {
        subject: `Your square is live on the ${payload.clubName} board`,
        html: emailWrapper(club, `
          <h2>Your square is live, ${fan}!</h2>
          <p>Square <strong>${ref}</strong> is now visible.</p>
          ${message ? `<blockquote>${message}</blockquote>` : ''}
          <p><a href="${link}" class="button">View the board</a></p>
        `),
      }
    case 'square_rejected':
      return {
        subject: `Your ${payload.clubName} tribute needs an update`,
        html: emailWrapper(club, `
          <h2>Hi ${fan},</h2>
          <p>Your payment remains confirmed and your square remains reserved.</p>
          <p>The club requested this change: <em>${note}</em></p>
          <p><a href="${link}" class="button">Update my tribute securely</a></p>
          <p class="small">This private link can be used once. Do not forward it.</p>
        `),
      }
    case 'club_new_purchase':
      return {
        subject: `New paid square — ${payload.fanName} (${payload.gridRef})`,
        html: emailWrapper(club, `
          <h2>New paid tribute awaiting review</h2>
          <table>
            <tr><td>Fan name</td><td><strong>${fan}</strong></td></tr>
            <tr><td>Square</td><td><strong>${ref}</strong></td></tr>
            ${message ? `<tr><td>Message</td><td>${message}</td></tr>` : ''}
          </table>
          <p><a href="${link.replace('/board/', '/admin/moderation')}" class="button">Open moderation queue</a></p>
        `),
      }
    default:
      return {
        subject: 'Stadium Squares notification',
        html: emailWrapper('Stadium Squares', '<p>You have a new notification.</p>'),
      }
  }
}

export async function sendDailyDigestEmail(input: {
  to: string
  clubName: string
  boardUrl: string
  purchases: Array<{ fan_name: string | null; grid_x: number; grid_y: number }>
}): Promise<boolean> {
  try {
    const club = escapeHtml(input.clubName)
    const rows = input.purchases.map(purchase => `
      <tr>
        <td>${escapeHtml(purchase.fan_name ?? 'Supporter')}</td>
        <td>R${purchase.grid_y + 1}–C${purchase.grid_x + 1}</td>
      </tr>
    `).join('')

    const html = emailWrapper(club, `
      <h2>Daily purchase summary</h2>
      <p>${input.purchases.length} confirmed ${input.purchases.length === 1 ? 'purchase is' : 'purchases are'} awaiting review.</p>
      ${rows ? `<table><tr><td><strong>Supporter</strong></td><td><strong>Square</strong></td></tr>${rows}</table>` : '<p>There were no new confirmed purchases.</p>'}
      <p><a href="${safeUrl(input.boardUrl)}" class="button">Open moderation queue</a></p>
    `)

    const result = await resend.emails.send({
      from: `${input.clubName} <noreply@stadiumsquares.io>`,
      to: input.to,
      subject: `${input.clubName} — daily Stadium Squares summary`,
      html,
    })
    if (result.error) throw new Error(result.error.message)
    return true
  } catch (err) {
    console.error('Daily digest email failed:', err)
    return false
  }
}
function emailWrapper(clubName: string, content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#f5f5f5;color:#1a1a1a}
.wrap{max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden}
.header{background:#8B0000;padding:20px 28px}.header h1{color:#fff;margin:0;font-size:18px}
.body{padding:24px 28px;line-height:1.6}.body h2{font-size:18px;margin:0 0 12px}.body p{font-size:14px}
blockquote{border-left:3px solid #8B0000;margin:12px 0;padding:8px 16px;color:#555}
.button{background:#1a1a1a;color:#fff!important;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block}
table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 0;vertical-align:top}.small{color:#777;font-size:12px!important}
.footer{padding:16px 28px;background:#f9f9f9;font-size:12px;color:#777;border-top:1px solid #eee}
</style></head><body><div class="wrap"><div class="header"><h1>${clubName}</h1></div>
<div class="body">${content}</div><div class="footer">Sent securely by Stadium Squares on behalf of ${clubName}.</div>
</div></body></html>`
}
