import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyAdminAccess(hoardingId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorised', status: 401, appUser: null, service: null }

  const { data: appUser } = await supabase
    .from('app_users').select('role, client_id').eq('id', user.id).single()
  if (!appUser) return { error: 'Unauthorised', status: 401, appUser: null, service: null }

  const service = createServiceClient()
  const { data: hoarding } = await service
    .from('hoardings').select('id, client_id').eq('id', hoardingId).single()
  if (!hoarding) return { error: 'Hoarding not found', status: 404, appUser: null, service: null }

  if (appUser.role === 'club_admin' && hoarding.client_id !== appUser.client_id) {
    return { error: 'Unauthorised', status: 403, appUser: null, service: null }
  }

  return { error: null, status: 200, appUser, service }
}

// ── Update hoarding details ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { hoardingId, linkUrl, bgColor } = await req.json()
    if (!hoardingId) return NextResponse.json({ error: 'Missing hoardingId' }, { status: 400 })

    const { error, status, service } = await verifyAdminAccess(hoardingId)
    if (error || !service) return NextResponse.json({ error }, { status })

    await service
      .from('hoardings')
      .update({
        link_url:  linkUrl  || null,
        bg_color:  bgColor  || '#1a1a1a',
      })
      .eq('id', hoardingId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Hoarding update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
