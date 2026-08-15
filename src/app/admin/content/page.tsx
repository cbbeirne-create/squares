import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentEditorClient } from './ContentEditorClient'

export default async function ContentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users').select('client_id').eq('id', user.id).single()
  if (!appUser?.client_id) redirect('/auth/login')

  const { data: client } = await supabase
    .from('clients')
    .select('id, promo_headline, promo_subheadline, promo_body, price_per_square, currency, currency_symbol')
    .eq('id', appUser.client_id)
    .single()

  if (!client) redirect('/auth/login')

  return (
    <ContentEditorClient
      clientId={client.id}
      initial={{
        promoHeadline:    client.promo_headline,
        promoSubheadline: client.promo_subheadline,
        promoBody:        client.promo_body,
        pricePerSquare:   client.price_per_square,
        currencySymbol:   client.currency_symbol,
        currency:         client.currency,
      }}
    />
  )
}
