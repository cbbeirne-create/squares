import { Resend } from 'resend'
import type { EmailPayload } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const { subject, html } = buildEmail(payload)
    await resend.emails.send({
      from:    `${payload.clubName} <noreply@stadiumsquares.io>`,
      to:      payload.to,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}

function buildEmail(p: EmailPayload): { subject: string; html: string } {
  switch (p.type) {
    case 'purchase_confirmation':
      return {
        subject: `Your ${p.clubName} square is reserved — ${p.gridRef}`,
        html: emailWrapper(p.clubName, `
          <h2>Thanks, ${p.fanName}!</h2>
          <p>Your square <strong>${p.gridRef}</strong> on the ${p.clubName} board is reserved and payment confirmed.</p>
          ${p.fanMessage ? `<blockquote>${p.fanMessage}</blockquote>` : ''}
          <p>Your message is now with the ${p.clubName} team for review. We'll email you within 48 hours once it's live on the board.</p>
          <p style="color:#888;font-size:13px;">Keep this email — it's your proof of purchase.</p>
        `),
      }

    case 'square_approved':
      return {
        subject: `Your square is live on the ${p.clubName} board!`,
        html: emailWrapper(p.clubName, `
          <h2>Your square is live, ${p.fanName}!</h2>
          <p>Square <strong>${p.gridRef}</strong> is now visible on the ${p.clubName} board.</p>
          ${p.fanMessage ? `<blockquote>${p.fanMessage}</blockquote>` : ''}
          <p><a href="${p.boardUrl}" style="background:var(--primary);color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">View your square</a></p>
          <p>Share it with fellow supporters — every square sold brings us closer to our goal!</p>
        `),
      }

    case 'square_rejected':
      return {
        subject: `Your ${p.clubName} square message needs a small update`,
        html: emailWrapper(p.clubName, `
          <h2>Hi ${p.fanName},</h2>
          <p>Thank you for supporting ${p.clubName} — your payment is confirmed and your square is still reserved.</p>
          <p>Unfortunately your message wasn't approved this time${p.rejectionNote ? `: <em>${p.rejectionNote}</em>` : '.'}</p>
          <p>Please resubmit a revised message and we'll review it promptly.</p>
          <p><a href="${p.boardUrl}?resubmit=${p.gridRef}" style="background:var(--primary);color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">Update my message</a></p>
          <p style="color:#888;font-size:13px;">If you'd prefer a refund instead, please reply to this email.</p>
        `),
      }

    case 'resubmission_approved':
      return {
        subject: `Your updated message is live — ${p.clubName} board`,
        html: emailWrapper(p.clubName, `
          <h2>You're on the board, ${p.fanName}!</h2>
          <p>Your updated message for square <strong>${p.gridRef}</strong> has been approved and is now live.</p>
          <p><a href="${p.boardUrl}" style="background:var(--primary);color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">View the board</a></p>
        `),
      }

    case 'club_new_purchase':
      return {
        subject: `New square claimed — ${p.fanName} (${p.gridRef})`,
        html: emailWrapper(p.clubName, `
          <h2>New purchase on your board</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#888">Fan name</td><td style="padding:6px 0;font-weight:500">${p.fanName}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Square</td><td style="padding:6px 0;font-weight:500">${p.gridRef}</td></tr>
            ${p.fanMessage ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top">Message</td><td style="padding:6px 0">${p.fanMessage}</td></tr>` : ''}
          </table>
          <p><a href="${p.boardUrl?.replace('/board/', '/admin/')}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">Review in moderation queue</a></p>
        `),
      }

    default:
      return { subject: 'Stadium Squares notification', html: emailWrapper('Stadium Squares', '<p>You have a new notification.</p>') }
  }
}

function emailWrapper(clubName: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin:0; padding:0; background:#f5f5f5; color:#1a1a1a; }
  .wrap { max-width:520px; margin:32px auto; background:#fff; border-radius:8px; overflow:hidden; }
  .header { background:#B22222; padding:20px 28px; }
  .header h1 { color:#fff; margin:0; font-size:18px; font-weight:500; }
  .body { padding:24px 28px; line-height:1.6; }
  .body h2 { font-size:18px; font-weight:500; margin:0 0 12px; }
  .body p { margin:0 0 12px; font-size:14px; color:#333; }
  blockquote { border-left:3px solid #B22222; margin:12px 0; padding:8px 16px; color:#555; font-style:italic; font-size:14px; }
  .footer { padding:16px 28px; background:#f9f9f9; font-size:12px; color:#999; border-top:1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>${clubName}</h1></div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>Stadium Squares — your permanent place in ${clubName} history.</p>
    <p>This email was sent by Stadium Squares on behalf of ${clubName}.</p>
  </div>
</div>
</body>
</html>`
}
