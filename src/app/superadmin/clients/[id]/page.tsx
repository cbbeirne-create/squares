import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ClientDetailClient } from './ClientDetailClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = createServiceClient()
  const { data } = await service
    .from('clients')
    .select('club_name')
    .eq('id', params.id)
    .single()
  return { title: data ? `${data.club_name} — Super Admin` : 'Client Detail' }
}

export default async function ClientDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (appUser?.role !== 'super_admin') redirect('/admin/moderation')

  const service = createServiceClient()

  // Load client with analytics in parallel
  const [{ data: client, error }, { data: analytics }] = await Promise.all([
    service
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single(),
    service
      .from('campaign_analytics')
      .select('*')
      .eq('client_id', params.id)
      .single(),
  ])

  if (error || !client) notFound()

  const clientDetail = {
    id:                 client.id,
    slug:               client.slug,
    clubName:           client.club_name,
    sport:              client.sport,
    status:             client.status,
    primaryColor:       client.primary_color,
    secondaryColor:     client.secondary_color,
    accentColor:        client.accent_color,
    standTop:           client.stand_top,
    standBottom:        client.stand_bottom,
    standLeft:          client.stand_left,
    standRight:         client.stand_right,
    gridCols:           client.grid_cols,
    gridRows:           client.grid_rows,
    pricePerSquare:     client.price_per_square,
    currencySymbol:     client.currency_symbol,
    currency:           client.currency,
    notificationEmail:  client.notification_email,
    stripeAccountId:    client.stripe_account_id,
    stripeOnboarded:    client.stripe_onboarded,
    platformFeeMonthly: client.platform_fee_monthly,
    archiveFeeMonthly:  client.archive_fee_monthly,
    launchedAt:         client.launched_at,
    soldOutAt:          client.sold_out_at,
    createdAt:          client.created_at,
    analytics: {
      totalSquares:   Number(analytics?.total_squares  ?? client.grid_cols * client.grid_rows),
      soldSquares:    Number(analytics?.sold_squares   ?? 0),
      pendingSquares: Number(analytics?.pending_squares ?? 0),
      revenueRaised:  Number(analytics?.revenue_raised ?? 0),
      percentSold:    Number(analytics?.percent_sold   ?? 0),
    },
  }

  return <ClientDetailClient client={clientDetail} />
}
