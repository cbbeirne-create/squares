import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users').select('role, client_id').eq('id', user.id).single()
    if (!appUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { clientId, promoHeadline, promoSubheadline, promoBody, pricePerSquare, currency, currencySymbol } = body

    // Club admins can only update their own client
    if (appUser.role === 'club_admin' && clientId !== appUser.client_id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    // Validate
    if (!promoHeadline?.trim()) return NextResponse.json({ error: 'Headline is required' }, { status: 400 })
    if (!promoBody?.trim())     return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    if (!pricePerSquare || pricePerSquare < 1) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })

    const service = createServiceClient()
    await service
      .from('clients')
      .update({
        promo_headline:    promoHeadline.trim(),
        promo_subheadline: promoSubheadline?.trim() ?? '',
        promo_body:        promoBody.trim(),
        price_per_square:  pricePerSquare,
        currency:          currency ?? 'EUR',
        currency_symbol:   currencySymbol ?? '€',
      })
      .eq('id', clientId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Content update error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
