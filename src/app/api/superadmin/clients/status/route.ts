import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type ClientStatus = 'setup' | 'active' | 'sold_out' | 'archived'

const VALID_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  setup:    ['active'],
  active:   ['archived'],
  sold_out: ['archived'],
  archived: ['active'],
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (appUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const { clientId, status: newStatus } = await req.json()

    if (!clientId || !newStatus) {
      return NextResponse.json({ error: 'Missing clientId or status' }, { status: 400 })
    }

    const service = createServiceClient()

    // Load current client
    const { data: client, error: fetchErr } = await service
      .from('clients')
      .select('id, status, stripe_onboarded')
      .eq('id', clientId)
      .single()

    if (fetchErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const currentStatus = client.status as ClientStatus

    // Validate transition
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      }, { status: 400 })
    }

    // Cannot launch without Stripe Connect
    if (newStatus === 'active' && !client.stripe_onboarded) {
      return NextResponse.json({
        error: 'Stripe Connect must be completed before launching this campaign',
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'active' ) updates.launched_at = now
    if (newStatus === 'archived') updates.sold_out_at = null // clear if archiving manually

    await service
      .from('clients')
      .update(updates)
      .eq('id', clientId)

    return NextResponse.json({ success: true, status: newStatus })

  } catch (err) {
    console.error('Status update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
