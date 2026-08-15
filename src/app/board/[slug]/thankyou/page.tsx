import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Check, Share2 } from 'lucide-react'

interface Props {
  params:      { slug: string }
  searchParams: { payment_intent?: string; redirect_status?: string }
}

export default async function ThankyouPage({ params, searchParams }: Props) {
  const supabase = createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('club_name, slug, primary_color, secondary_color, accent_color, currency_symbol, price_per_square')
    .eq('slug', params.slug)
    .single()

  if (!client) notFound()

  // Look up the square linked to this payment intent
  const paymentIntentId = searchParams.payment_intent
  let fanName: string | null = null
  let gridRef: string | null = null

  if (paymentIntentId) {
    const { data: square } = await supabase
      .from('squares')
      .select('fan_name, grid_x, grid_y')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    if (square) {
      fanName = square.fan_name
      gridRef = `R${square.grid_y + 1}–C${square.grid_x + 1}`
    }
  }

  const failed = searchParams.redirect_status === 'failed'

  const cssVars = {
    '--club-primary':   client.primary_color,
    '--club-secondary': client.secondary_color,
    '--club-accent':    client.accent_color,
  } as React.CSSProperties

  const boardUrl = `/board/${client.slug}`
  const shareUrl = `/api/share-card?slug=${client.slug}${gridRef ? `&ref=${encodeURIComponent(gridRef)}` : ''}${fanName ? `&name=${encodeURIComponent(fanName)}` : ''}`

  return (
    <main style={cssVars} className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm text-center">

        {failed ? (
          /* Payment failed */
          <div className="bg-background border border-border rounded-xl p-8">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            <h1 className="text-lg font-medium text-foreground mb-2">Payment unsuccessful</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your payment didn't go through and your square has not been reserved.
              Please try again — no charge was made.
            </p>
            <Link
              href={boardUrl}
              className="inline-flex items-center justify-center w-full bg-foreground text-background text-sm font-medium py-2.5 rounded-md hover:opacity-90 transition-opacity"
            >
              Return to the board
            </Link>
          </div>
        ) : (
          /* Payment succeeded */
          <div>
            {/* Club header */}
            <div
              className="rounded-t-xl px-6 py-4"
              style={{ background: 'var(--club-primary)' }}
            >
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">{client.club_name}</p>
              <p className="text-white font-medium">Stadium Squares</p>
            </div>

            <div className="bg-background border border-t-0 border-border rounded-b-xl p-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-green-600" />
              </div>

              <h1 className="text-lg font-medium text-foreground mb-1">
                {fanName ? `Thanks, ${fanName.split(' ')[0]}!` : 'Payment confirmed!'}
              </h1>

              {gridRef && (
                <p className="text-sm text-muted-foreground mb-1">
                  Square <strong className="text-foreground">{gridRef}</strong> is reserved for you.
                </p>
              )}

              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                We've emailed you a confirmation. Your message will be reviewed by{' '}
                {client.club_name} within 48 hours — we'll email you once it's live.
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href={boardUrl}
                  className="inline-flex items-center justify-center gap-2 w-full text-sm font-medium py-2.5 rounded-md text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--club-primary)' }}
                >
                  View the board
                </Link>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full text-sm font-medium py-2.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                >
                  <Share2 size={14} />
                  Share my square
                </a>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Secure payment processed by Stripe ·{' '}
                {client.currency_symbol}{client.price_per_square} charged
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
