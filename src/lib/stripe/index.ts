import Stripe from 'stripe'
import type { Client, PurchaseIntent, PurchaseResult } from '@/types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export async function createPurchaseIntent(
  intent: PurchaseIntent,
  client: Client
): Promise<PurchaseResult> {
  try {
    if (!client.stripeAccountId || !client.stripeOnboarded) {
      return { success: false, clientSecret: null, paymentIntentId: null, squareId: null, error: 'Club payment account not configured' }
    }

    const amountCents = Math.round(client.pricePerSquare * 100)

    // Application fee: platform takes nothing from fan payments
    // Club receives 100% — platform fee is billed separately monthly
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: client.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          client_id:   client.id,
          client_slug: client.slug,
          grid_x:      intent.gridX.toString(),
          grid_y:      intent.gridY.toString(),
          fan_name:    intent.fanName,
          fan_email:   intent.fanEmail,
        },
        receipt_email: intent.fanEmail,
        description:   `${client.clubName} — Stadium Square R${intent.gridY + 1}–C${intent.gridX + 1}`,
      },
      { stripeAccount: client.stripeAccountId }
    )

    return {
      success:         true,
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      squareId:        null,
      error:           null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment setup failed'
    return { success: false, clientSecret: null, paymentIntentId: null, squareId: null, error: message }
  }
}

export async function generateConnectOnboardingLink(
  clientId: string,
  clientSlug: string,
  email: string
): Promise<{ url: string | null; accountId: string | null; error: string | null }> {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: { client_id: clientId, client_slug: clientSlug },
      capabilities: {
        card_payments: { requested: true },
        transfers:     { requested: true },
      },
    })

    const link = await stripe.accountLinks.create({
      account:     account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/superadmin/clients/${clientId}/stripe-refresh`,
      return_url:  `${process.env.NEXT_PUBLIC_APP_URL}/superadmin/clients/${clientId}/stripe-complete`,
      type:        'account_onboarding',
    })

    return { url: link.url, accountId: account.id, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Stripe Connect link'
    return { url: null, accountId: null, error: message }
  }
}

export async function verifyStripeOnboarding(
  stripeAccountId: string
): Promise<boolean> {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId)
    return account.details_submitted && account.charges_enabled
  } catch {
    return false
  }
}
