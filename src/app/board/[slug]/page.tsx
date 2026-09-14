import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import BoardClient from './BoardClient'
import type { Client, Square } from '@/types'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = createServiceClient()
  const { data } = await service
    .from('clients')
    .select('club_name, promo_headline, promo_subheadline')
    .eq('slug', params.slug)
    .in('status', ['active', 'sold_out'])
    .single()

  if (!data) return { title: 'Stadium Squares' }
  return {
    title: `${data.club_name} — Stadium Squares`,
    description: data.promo_subheadline,
    openGraph: {
      title: `${data.club_name} — Claim your square`,
      description: data.promo_headline,
      images: [`/api/og/${params.slug}`],
    },
  }
}

async function getClient(slug: string): Promise<Client | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('clients')
    .select('id, slug, club_name, sport, status, primary_color, secondary_color, accent_color, stand_top, stand_bottom, stand_left, stand_right, promo_headline, promo_subheadline, promo_body, grid_cols, grid_rows, price_per_square, currency, currency_symbol, stripe_account_id, stripe_onboarded, launched_at, sold_out_at, created_at, hoardings(id, position, logo_url, link_url, bg_color, is_published)')
    .eq('slug', slug)
    .in('status', ['active', 'sold_out'])
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    slug: data.slug,
    clubName: data.club_name,
    sport: data.sport,
    status: data.status,
    theme: {
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      accentColor: data.accent_color,
    },
    standGraphics: {
      top: data.stand_top,
      bottom: data.stand_bottom,
      left: data.stand_left,
      right: data.stand_right,
    },
    hoardings: (data.hoardings ?? []).map(hoarding => ({
      id: hoarding.id,
      position: hoarding.position,
      logoUrl: hoarding.logo_url,
      linkUrl: hoarding.link_url,
      bgColor: hoarding.bg_color,
      isPublished: hoarding.is_published,
    })),
    promo: {
      headline: data.promo_headline,
      subheadline: data.promo_subheadline,
      body: data.promo_body,
    },
    gridCols: data.grid_cols,
    gridRows: data.grid_rows,
    pricePerSquare: Number(data.price_per_square),
    currency: data.currency,
    currencySymbol: data.currency_symbol,
    notificationEmail: '',
    stripeAccountId: data.stripe_account_id,
    stripeOnboarded: data.stripe_onboarded,
    platformFeeMonthly: 0,
    archiveFeeMonthly: 0,
    launchedAt: data.launched_at,
    soldOutAt: data.sold_out_at,
    createdAt: data.created_at,
  }
}

async function getSquares(clientId: string): Promise<Square[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('squares')
    .select('id, client_id, grid_x, grid_y, status, payment_status, fan_name, fan_message, purchased_at, published_at, is_reserved, reserved_label')
    .eq('client_id', clientId)
    .or('is_reserved.eq.true,payment_status.in.(payment_pending,paid)')

  return (data ?? []).map(square => {
    const isPublicTribute = square.status === 'published' && square.payment_status === 'paid'
    return {
      id: square.id,
      clientId: square.client_id,
      gridX: square.grid_x,
      gridY: square.grid_y,
      status: isPublicTribute ? 'published' : square.is_reserved ? 'reserved' : 'pending',
      fanName: isPublicTribute ? square.fan_name : null,
      fanMessage: isPublicTribute ? square.fan_message : null,
      fanEmail: null,
      purchasedAt: isPublicTribute ? square.purchased_at : null,
      publishedAt: isPublicTribute ? square.published_at : null,
      rejectedAt: null,
      stripePaymentIntentId: null,
      isReserved: square.is_reserved,
      reservedLabel: square.is_reserved ? square.reserved_label : null,
    } as Square
  })
}

export default async function BoardPage({ params }: Props) {
  const client = await getClient(params.slug)
  if (!client) notFound()
  const squares = await getSquares(client.id)
  const cssVars = {
    '--club-primary': client.theme.primaryColor,
    '--club-secondary': client.theme.secondaryColor,
    '--club-accent': client.theme.accentColor,
  } as React.CSSProperties

  return (
    <main style={cssVars} className="min-h-screen bg-background">
      <BoardClient client={client} initialSquares={squares} />
    </main>
  )
}
