import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { safeHttpUrl, validHexColor } from '@/lib/uploads'

async function verifyAdminAccess(hoardingId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorised', status: 401, service: null }

  const { data: appUser } = await supabase.from('app_users').select('role, client_id').eq('id', user.id).single()
  if (!appUser) return { error: 'Unauthorised', status: 401, service: null }

  const service = createServiceClient()
  const { data: hoarding } = await service.from('hoardings').select('id, client_id').eq('id', hoardingId).single()
  if (!hoarding) return { error: 'Hoarding not found', status: 404, service: null }
  if (appUser.role === 'club_admin' && hoarding.client_id !== appUser.client_id) {
    return { error: 'Unauthorised', status: 403, service: null }
  }
  return { error: null, status: 200, service }
}

export async function POST(req: NextRequest) {
  try {
    const { hoardingId, linkUrl, bgColor } = await req.json()
    if (typeof hoardingId !== 'string') return NextResponse.json({ error: 'Missing hoardingId' }, { status: 400 })
    const cleanLink = linkUrl ? safeHttpUrl(linkUrl) : null
    if (linkUrl && !cleanLink) return NextResponse.json({ error: 'Sponsor link must be a valid HTTP or HTTPS URL' }, { status: 400 })
    if (!validHexColor(bgColor)) return NextResponse.json({ error: 'Background colour must be a six-digit hex colour' }, { status: 400 })

    const { error, status, service } = await verifyAdminAccess(hoardingId)
    if (error || !service) return NextResponse.json({ error }, { status })

    const { error: updateError } = await service.from('hoardings').update({ link_url: cleanLink, bg_color: bgColor }).eq('id', hoardingId)
    if (updateError) throw updateError
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Hoarding update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
