import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BoardClient from './BoardClient'
import type { Client, Square } from '@/types'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('clients')
    .select('club_name, promo_headline, promo_subheadline')
    .eq('slug', params.slug)
    .single()

  if (!data) return { title: 'Stadium Squares' }
  return {
    title:       `${data.club_name} — Stadium Squares`,
    description: data.promo_subheadline,
    openGraph: {
      title:       `${data.club_name} — Claim your square`,
      description: data.promo_headline,
      images: [`/api/og/${params.slug}`],
    },
  }
}

async function getClient(slug: string): Promise<Client | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, hoardings(*)`)
    .eq('slug', slug)
    .in('status', ['active', 'sold_out'])
    .single()

  if (error || !data) return null

  return {
    id:               data.id,
    slug:             data.slug,
    clubName:         data.club_name,
    sport:            data.sport,
    status:           data.status,
    theme: {
      primaryColor:   data.primary_color,
      secondaryColor: data.secondary_color,
      accentColor:    data.accent_color,
    },
    standGraphics: {
      top:    data.stand_top,
      bottom: data.stand_bottom,
      left:   data.stand_left,
      right:  data.stand_right,
    },
    hoardings:        data.hoardings ?? [],
    promo: {
      headline:    data.promo_headline,
      subheadline: data.promo_subheadline,
      body:        data.promo_body,
    },
    gridCols:            data.grid_cols,
    gridRows:            data.grid_rows,
    pricePerSquare:      data.price_per_square,
    currency:            data.currency,
    currencySymbol:      data.currency_symbol,
    notificationEmail:   data.notification_email,
    stripeAccountId:     data.stripe_account_id,
    stripeOnboarded:     data.stripe_onboarded,
    platformFeeMonthly:  data.platform_fee_monthly,
    archiveFeeMonthly:   data.archive_fee_monthly,
    launchedAt:          data.launched_at,
    soldOutAt:           data.sold_out_at,
    createdAt:           data.created_at,
  }
}

async function getSquares(clientId: string): Promise<Square[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('squares')
    .select('*')
    .eq('client_id', clientId)
    .neq('status', 'available')

  return (data ?? []).map(s => ({
    id:                    s.id,
    clientId:              s.client_id,
    gridX:                 s.grid_x,
    gridY:                 s.grid_y,
    status:                s.status,
    fanName:               s.fan_name,
    fanMessage:            s.fan_message,
    fanEmail:              s.fan_email,
    purchasedAt:           s.purchased_at,
    publishedAt:           s.published_at,
    rejectedAt:            s.rejected_at,
    stripePaymentIntentId: s.stripe_payment_intent_id,
    isReserved:            s.is_reserved,
    reservedLabel:         s.reserved_label,
  }))
}

export default async function BoardPage({ params }: Props) {
  const client = await getClient(params.slug)
  if (!client) notFound()

  const squares = await getSquares(client.id)

  // Inject club CSS variables at page level
  const cssVars = {
    '--club-primary':   client.theme.primaryColor,
    '--club-secondary': client.theme.secondaryColor,
    '--club-accent':    client.theme.accentColor,
  } as React.CSSProperties

  return (
    <main style={cssVars} className="min-h-screen bg-background">
      <BoardClient client={client} initialSquares={squares} />
    </main>
  )
}
