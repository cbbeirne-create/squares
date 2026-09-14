import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendDailyDigestEmail } from '@/lib/email'

function parts(date: Date, timezone: string): Record<string, string> {
  const result: Record<string, string> = {}
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') result[part.type] = part.value
  }
  return result
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()
  const { data: preferences, error } = await service
    .from('notification_preferences')
    .select('client_id, notification_email, digest_time, timezone, last_digest_sent_at, clients(club_name, slug)')
    .eq('daily_digest', true)

  if (error) {
    console.error('Digest preferences lookup failed:', error)
    return NextResponse.json({ error: 'Digest lookup failed' }, { status: 500 })
  }

  let sent = 0
  const failures: string[] = []

  for (const preference of preferences ?? []) {
    try {
      const timezone = preference.timezone || 'Europe/Dublin'
      const current = parts(now, timezone)
      const desiredHour = String(preference.digest_time ?? '08:00').slice(0, 2)
      if (current.hour !== desiredHour) continue

      if (preference.last_digest_sent_at) {
        const previous = parts(new Date(preference.last_digest_sent_at), timezone)
        if (previous.year === current.year && previous.month === current.month && previous.day === current.day) continue
      }

      const since = preference.last_digest_sent_at ?? new Date(now.getTime() - 24 * 60 * 60_000).toISOString()
      const { data: purchases, error: purchaseError } = await service
        .from('squares')
        .select('fan_name, grid_x, grid_y')
        .eq('client_id', preference.client_id)
        .eq('payment_status', 'paid')
        .gte('payment_confirmed_at', since)
        .order('payment_confirmed_at', { ascending: true })
      if (purchaseError) throw purchaseError

      const club = Array.isArray(preference.clients) ? preference.clients[0] : preference.clients
      if (!club) throw new Error('Digest client was not found')

      if ((purchases ?? []).length > 0) {
        const delivered = await sendDailyDigestEmail({
          to: preference.notification_email,
          clubName: club.club_name,
          boardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/moderation`,
          purchases: purchases ?? [],
        })
        if (!delivered) throw new Error('Digest delivery failed')
        sent++
      }

      const { error: updateError } = await service.from('notification_preferences').update({ last_digest_sent_at: now.toISOString() }).eq('client_id', preference.client_id)
      if (updateError) throw updateError
    } catch (err) {
      console.error(`Digest failed for client ${preference.client_id}:`, err)
      failures.push(preference.client_id)
    }
  }

  return NextResponse.json({ success: failures.length === 0, sent, failures }, { status: failures.length ? 207 : 200 })
}
