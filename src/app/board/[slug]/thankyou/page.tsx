import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { Check, Clock } from 'lucide-react'

interface Props {
  params: { slug: string }
  searchParams: { payment_intent?: string }
}

export default async function ThankyouPage({ params, searchParams }: Props) {
  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id, club_name, slug, primary_color, secondary_color, accent_color, stripe_account_id')
    .eq('slug', params.slug)
    .in('status', ['active', 'sold_out'])
    .single()

  if (!client) notFound()

  let status: 'succeeded' | 'processing' | 'failed' = 'failed'
  const paymentIntentId = searchParams.payment_intent

  if (paymentIntentId && client.stripe_account_id) {
    const { data: square } = await service
      .from('squares')
      .select('id')
      .eq('client_id', client.id)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (square) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          stripeAccount: client.stripe_account_id,
        })
        status = intent.status === 'succeeded'
          ? 'succeeded'
          : intent.status === 'processing'
            ? 'processing'
            : 'failed'
      } catch {
        status = 'failed'
      }
    }
  }

  const cssVars = {
    '--club-primary': client.primary_color,
    '--club-secondary': client.secondary_color,
    '--club-accent': client.accent_color,
  } as React.CSSProperties

  return (
    <main style={cssVars} className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm bg-background border border-border rounded-xl p-8 text-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${status === 'failed' ? 'bg-red-100' : status === 'processing' ? 'bg-amber-100' : 'bg-green-100'}`}>
          {status === 'succeeded'
            ? <Check size={24} className="text-green-600" />
            : status === 'processing'
              ? <Clock size={24} className="text-amber-600" />
              : <span className="text-red-600 text-2xl">✕</span>}
        </div>
        <h1 className="text-lg font-medium text-foreground mb-2">
          {status === 'succeeded' ? 'Payment confirmed' : status === 'processing' ? 'Payment processing' : 'Payment not confirmed'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {status === 'succeeded'
            ? `Thank you for supporting ${client.club_name}. We will email you after the tribute has been reviewed.`
            : status === 'processing'
              ? 'Stripe is still processing your payment. We will email you when it is confirmed.'
              : 'We could not verify a successful payment. No tribute will be published unless Stripe confirms it.'}
        </p>
        <Link href={`/board/${client.slug}`} className="inline-flex min-h-11 items-center justify-center w-full text-white text-sm font-medium px-4 py-2.5 rounded-md" style={{ background: 'var(--club-primary)' }}>
          Return to the board
        </Link>
      </div>
    </main>
  )
}
