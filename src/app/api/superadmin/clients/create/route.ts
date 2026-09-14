import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { imageExtension, validateImageFile } from '@/lib/uploads'

const schema = z.object({
  clubName: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sport: z.enum(['rugby', 'gaa', 'soccer']),
  notificationEmail: z.string().trim().email(),
  gridCols: z.coerce.number().int().min(5).max(100),
  gridRows: z.coerce.number().int().min(5).max(100),
  pricePerSquare: z.coerce.number().min(1).max(999),
  currency: z.enum(['EUR', 'GBP', 'USD']),
  currencySymbol: z.enum(['€', '£', '$']),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  platformFee: z.coerce.number().min(0).max(10000),
  archiveFee: z.coerce.number().min(0).max(10000),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const { data: appUser } = await supabase.from('app_users').select('role').eq('id', user.id).single()
    if (appUser?.role !== 'super_admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

    const form = await req.formData()
    const value = (key: string, fallback = '') => String(form.get(key) ?? fallback)
    const parsed = schema.safeParse({
      clubName: value('clubName'),
      slug: value('slug'),
      sport: value('sport'),
      notificationEmail: value('notificationEmail'),
      gridCols: value('gridCols', '28'),
      gridRows: value('gridRows', '18'),
      pricePerSquare: value('pricePerSquare', '10'),
      currency: value('currency', 'EUR'),
      currencySymbol: value('currencySymbol', '€'),
      primaryColor: value('primaryColor', '#B22222'),
      secondaryColor: value('secondaryColor', '#8B0000'),
      accentColor: value('accentColor', '#FFD700'),
      platformFee: value('platformFee', '49'),
      archiveFee: value('archiveFee', '9'),
    })
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid client details' }, { status: 400 })
    const input = parsed.data
    if (input.gridCols * input.gridRows > 5000) return NextResponse.json({ error: 'Grid cannot exceed 5,000 squares' }, { status: 400 })

    const service = createServiceClient()
    const uploadedPaths: string[] = []
    const uploadStand = async (position: string): Promise<string | null> => {
      const key = `stand${position.charAt(0).toUpperCase() + position.slice(1)}`
      const file = form.get(key) as File | null
      if (!file || file.size === 0) return null
      const validationError = await validateImageFile(file, 5 * 1024 * 1024)
      if (validationError) throw new Error(`${position} stand: ${validationError}`)
      const path = `${input.slug}/${position}.${imageExtension(file)}`
      const { error } = await service.storage.from('stand-graphics').upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true })
      if (error) throw error
      uploadedPaths.push(path)
      return service.storage.from('stand-graphics').getPublicUrl(path).data.publicUrl
    }

    const [standTop, standBottom, standLeft, standRight] = await Promise.all(['top', 'bottom', 'left', 'right'].map(uploadStand))
    const { data: newClient, error: insertError } = await service.from('clients').insert({
      slug: input.slug, club_name: input.clubName, sport: input.sport, status: 'setup',
      primary_color: input.primaryColor, secondary_color: input.secondaryColor, accent_color: input.accentColor,
      stand_top: standTop, stand_bottom: standBottom, stand_left: standLeft, stand_right: standRight,
      promo_headline: `Own your place in ${input.clubName} history`,
      promo_subheadline: 'Claim a square. Leave your name and memory. Forever.',
      promo_body: 'Purchase a square on our pitch and leave your name and a personal message.',
      grid_cols: input.gridCols, grid_rows: input.gridRows, price_per_square: input.pricePerSquare,
      currency: input.currency, currency_symbol: input.currencySymbol, notification_email: input.notificationEmail,
      platform_fee_monthly: input.platformFee, archive_fee_monthly: input.archiveFee,
    }).select('id').single()

    if (insertError || !newClient) {
      if (uploadedPaths.length) await service.storage.from('stand-graphics').remove(uploadedPaths)
      if (insertError?.code === '23505') return NextResponse.json({ error: 'URL slug already in use' }, { status: 409 })
      throw insertError ?? new Error('Client insert failed')
    }

    const [hoardings, notifications] = await Promise.all([
      service.from('hoardings').insert(['top', 'bottom', 'left', 'right'].map(position => ({ client_id: newClient.id, position, bg_color: '#1a1a1a', is_published: false }))),
      service.from('notification_preferences').insert({ client_id: newClient.id, notification_email: input.notificationEmail, new_purchase_alert: true, daily_digest: false }),
    ])

    if (hoardings.error || notifications.error) {
      await service.from('clients').delete().eq('id', newClient.id)
      if (uploadedPaths.length) await service.storage.from('stand-graphics').remove(uploadedPaths)
      throw hoardings.error ?? notifications.error
    }

    return NextResponse.json({ success: true, clientId: newClient.id })
  } catch (err) {
    console.error('Client creation error:', err)
    const message = err instanceof Error && err.message.includes('stand:') ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: message === 'Internal server error' ? 500 : 400 })
  }
}
