import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date().toISOString()
  const { data: stale, error } = await service
    .from('squares')
    .select('id, stripe_payment_intent_id, clients(stripe_account_id)')
    .eq('payment_status', 'payment_pending')
    .lt('reservation_expires_at', now)
    .limit(100)

  if (error) {
    console.error('Stale-square lookup failed:', error)
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
  }

  let released = 0
  let reconciled = 0
  const failures: string[] = []

  for (const square of stale ?? []) {
    try {
      const relatedClient = Array.isArray(square.clients) ? square.clients[0] : square.clients
      const accountId = relatedClient?.stripe_account_id
      const intentId = square.stripe_payment_intent_id

      if (intentId && accountId) {
        const intent = await stripe.paymentIntents.retrieve(intentId, {
          stripeAccount: accountId,
        })

        if (intent.status === 'succeeded') {
          const { error: reconcileError } = await service
            .from('squares')
            .update({
              payment_status: 'paid',
              payment_confirmed_at: new Date().toISOString(),
              reservation_expires_at: null,
            })
            .eq('id', square.id)
            .eq('payment_status', 'payment_pending')
          if (reconcileError) throw reconcileError
          reconciled++
          continue
        }

        if (intent.status === 'processing') continue

        if (intent.status !== 'canceled') {
          await stripe.paymentIntents.cancel(intentId, {}, { stripeAccount: accountId })
        }
      }

      const { error: deleteError } = await service
        .from('squares')
        .delete()
        .eq('id', square.id)
        .eq('payment_status', 'payment_pending')
      if (deleteError) throw deleteError
      released++
    } catch (err) {
      console.error(`Failed to clean reservation ${square.id}:`, err)
      failures.push(square.id)
    }
  }

  await service
    .from('api_rate_limits')
    .delete()
    .lt('window_started_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString())

  return NextResponse.json({
    success: failures.length === 0,
    examined: stale?.length ?? 0,
    released,
    reconciled,
    failures,
  }, { status: failures.length ? 207 : 200 })
}
