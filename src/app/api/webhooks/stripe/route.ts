import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = headers().get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { client_id, grid_x, grid_y } = pi.metadata

      if (!client_id || grid_x === undefined || grid_y === undefined) break

      // This is the actual source of truth that payment succeeded.
      // The square was inserted as 'pending' with payment_confirmed_at
      // null when the PaymentIntent was created — this webhook is what
      // confirms real money changed hands.
      await supabase
        .from('squares')
        .update({
          stripe_payment_intent_id: pi.id,
          payment_confirmed_at:     new Date().toISOString(),
        })
        .eq('client_id', client_id)
        .eq('grid_x', parseInt(grid_x))
        .eq('grid_y', parseInt(grid_y))
        .eq('status', 'pending')

      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { client_id, grid_x, grid_y } = pi.metadata

      if (!client_id || grid_x === undefined || grid_y === undefined) break

      // Release the square back to available. payment_confirmed_at is
      // only ever set by the payment_intent.succeeded case above, so a
      // pending square reaching this handler is always genuinely unpaid —
      // safe to delete unconditionally rather than filtering on a field
      // that was previously (incorrectly) never null.
      await supabase
        .from('squares')
        .delete()
        .eq('client_id', client_id)
        .eq('grid_x', parseInt(grid_x))
        .eq('grid_y', parseInt(grid_y))
        .eq('status', 'pending')
        .is('payment_confirmed_at', null)

      break
    }

    case 'account.updated': {
      // Stripe Connect onboarding completed
      const account = event.data.object as Stripe.Account
      if (account.details_submitted && account.charges_enabled) {
        await supabase
          .from('clients')
          .update({ stripe_onboarded: true })
          .eq('stripe_account_id', account.id)
      }
      break
    }

    default:
      // Unhandled event type — safe to ignore
      break
  }

  return NextResponse.json({ received: true })
}
