import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateConnectOnboardingLink } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users').select('role').eq('id', user.id).single()
    if (appUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const form = await req.formData()
    const get  = (k: string) => form.get(k) as string | null

    const clubName          = get('clubName')?.trim()
    const slug              = get('slug')?.trim()
    const sport             = get('sport')
    const notificationEmail = get('notificationEmail')?.trim()

    if (!clubName || !slug || !sport || !notificationEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const service = createServiceClient()

    // Check slug is unique
    const { data: existing } = await service
      .from('clients').select('id').eq('slug', slug).single()
    if (existing) {
      return NextResponse.json({ error: 'URL slug already in use. Choose a different one.' }, { status: 409 })
    }

    // Upload stand graphics to Supabase Storage
    const uploadStand = async (position: string): Promise<string | null> => {
      const file = form.get(`stand${position.charAt(0).toUpperCase() + position.slice(1)}`) as File | null
      if (!file || file.size === 0) return null
      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `${slug}/${position}.${ext}`
      const buf  = await file.arrayBuffer()
      const { error } = await service.storage
        .from('stand-graphics')
        .upload(path, buf, { contentType: file.type, upsert: true })
      if (error) { console.error(`Stand ${position} upload error:`, error); return null }
      const { data: { publicUrl } } = service.storage.from('stand-graphics').getPublicUrl(path)
      return publicUrl
    }

    const [standTop, standBottom, standLeft, standRight] = await Promise.all([
      uploadStand('top'),
      uploadStand('bottom'),
      uploadStand('left'),
      uploadStand('right'),
    ])

    // Create client record
    const { data: newClient, error: insertErr } = await service
      .from('clients')
      .insert({
        slug,
        club_name:            clubName,
        sport,
        status:               'setup',
        primary_color:        get('primaryColor')    ?? '#B22222',
        secondary_color:      get('secondaryColor')  ?? '#8B0000',
        accent_color:         get('accentColor')     ?? '#FFD700',
        stand_top:            standTop,
        stand_bottom:         standBottom,
        stand_left:           standLeft,
        stand_right:          standRight,
        promo_headline:       `Own your place in ${clubName} history`,
        promo_subheadline:    `Claim a square. Leave your name and memory. Forever.`,
        promo_body:           `Purchase a square on our pitch and leave your name and a personal message — a memory of your favourite match, a tribute to someone special, or simply your pride in the jersey.`,
        grid_cols:            parseInt(get('gridCols') ?? '28'),
        grid_rows:            parseInt(get('gridRows') ?? '18'),
        price_per_square:     parseFloat(get('pricePerSquare') ?? '10'),
        currency:             get('currency')        ?? 'EUR',
        currency_symbol:      get('currencySymbol')  ?? '€',
        notification_email:   notificationEmail,
        platform_fee_monthly: parseFloat(get('platformFee') ?? '49'),
        archive_fee_monthly:  parseFloat(get('archiveFee')  ?? '9'),
      })
      .select('id')
      .single()

    if (insertErr || !newClient) {
      console.error('Client insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Create default hoarding slots
    await service.from('hoardings').insert([
      { client_id: newClient.id, position: 'top',    bg_color: '#1a1a1a', is_published: false },
      { client_id: newClient.id, position: 'bottom', bg_color: '#1a1a1a', is_published: false },
      { client_id: newClient.id, position: 'left',   bg_color: '#1a1a1a', is_published: false },
      { client_id: newClient.id, position: 'right',  bg_color: '#1a1a1a', is_published: false },
    ])

    // Create default notification preferences
    await service.from('notification_preferences').insert({
      client_id:          newClient.id,
      notification_email: notificationEmail,
      new_purchase_alert: true,
      daily_digest:       false,
    })

    return NextResponse.json({ success: true, clientId: newClient.id })

  } catch (err) {
    console.error('Client creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
