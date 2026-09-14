import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { boardUrl, gridRef } from '@/lib/utils'

async function handleSucceeded(event: Stripe.Event, pi: Stripe.PaymentIntent) {
  const squareId = pi.metadata.square_id
  if (!squareId) throw new Error(`PaymentIntent ${pi.id} has no square_id metadata`)

  const service = createServiceClient()
  const { data: square, error } = await service
    .from('squares')
    .select('*, clients(club_name, slug, stripe_account_id, notification_email)')
    .eq('id', squareId)
    .single()

  if (error || !square) throw new Error(`Square ${squareId} was not found`)
  if (square.client_id !== pi.metadata.client_id) throw new Error('Payment client metadata mismatch')
  if (event.account && square.clients.stripe_account_id !== event.account) {
    throw new Error('Connected Stripe account mismatch')
  }
  if (square.stripe_payment_intent_id && square.stripe_payment_intent_id !== pi.id) {
    throw new Error('PaymentIntent does not belong to this square')
  }
  if (square.payment_status === 'paid') return

  const { error: updateError } = await service
    .from('squares')
    .update({
      stripe_payment_intent_id: pi.id,
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      reservation_expires_at: null,
    })
    .eq('id', squareId)
    .eq('payment_status', 'payment_pending')

  if (updateError) throw updateError

  const ref = gridRef(square.grid_x, square.grid_y)
  const url = boardUrl(square.clients.slug)
  await sendEmail({
    type: 'purchase_confirmation',
    to: square.fan_email,
    fanName: square.fan_name,
    clubName: square.clients.club_name,
    clubSlug: square.clients.slug,
    gridRef: ref,
    fanMessage: square.fan_message ?? undefined,
    boardUrl: url,
  })

  const { data: preferences } = await service
    .from('notification_preferences')
    .select('notification_email, new_purchase_alert')
    .eq('client_id', square.client_id)
    .maybeSingle()

  if (preferences?.new_purchase_alert) {
    await sendEmail({
      type: 'club_new_purchase',
      to: preferences.notification_email ?? square.clients.notification_email,
      fanName: square.fan_name,
      clubName: square.clients.club_name,
      clubSlug: square.clients.slug,
      gridRef: ref,
      fanMessage: square.fan_message ?? undefined,
      boardUrl: url,
    })
  }
}

async function handleFailed(pi: Stripe.PaymentIntent) {
  const squareId = pi.metadata.square_id
  if (!squareId) return
  const service = createServiceClient()
  const { error } = await service
    .from('squares')
    .delete()
    .eq('id', squareId)
    .eq('stripe_payment_intent_id', pi.id)
    .eq('payment_status', 'payment_pending')
  if (error) throw error
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handleSucceeded(event, event.data.object as Stripe.PaymentIntent)
      return
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled':
      await handleFailed(event.data.object as Stripe.PaymentIntent)
      return
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      const service = createServiceClient()
      const { error } = await service
        .from('clients')
        .update({
          stripe_onboarded: Boolean(account.details_submitted && account.charges_enabled),
        })
        .eq('stripe_account_id', account.id)
      if (error) throw error
      return
    }
    default:
      return
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error: claimError } = await service
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (claimError?.code === '23505') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claimError) {
    console.error('Could not claim webhook event:', claimError)
    return NextResponse.json({ error: 'Webhook persistence failed' }, { status: 500 })
  }

  try {
    await processEvent(event)
    const { error: completedError } = await service
      .from('stripe_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', event.id)
    if (completedError) throw completedError
    return NextResponse.json({ received: true })
  } catch (err) {
    await service.from('stripe_webhook_events').delete().eq('event_id', event.id)
    console.error('Webhook processing failed:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
