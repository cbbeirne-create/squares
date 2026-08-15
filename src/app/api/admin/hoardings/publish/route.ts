import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { hoardingId, isPublished } = await req.json()
    if (!hoardingId || isPublished === undefined) {
      return NextResponse.json({ error: 'Missing hoardingId or isPublished' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users').select('role, client_id').eq('id', user.id).single()
    if (!appUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const service = createServiceClient()
    const { data: hoarding } = await service
      .from('hoardings').select('id, client_id, logo_url').eq('id', hoardingId).single()
    if (!hoarding) return NextResponse.json({ error: 'Hoarding not found' }, { status: 404 })

    if (appUser.role === 'club_admin' && hoarding.client_id !== appUser.client_id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    // Prevent publishing without a logo
    if (isPublished && !hoarding.logo_url) {
      return NextResponse.json({ error: 'Upload a sponsor logo before publishing' }, { status: 400 })
    }

    await service
      .from('hoardings')
      .update({ is_published: isPublished })
      .eq('id', hoardingId)

    return NextResponse.json({ success: true, isPublished })

  } catch (err) {
    console.error('Hoarding publish error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
