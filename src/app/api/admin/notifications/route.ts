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

    const { clientId, notificationEmail, newPurchaseAlert, dailyDigest, digestTime } = await req.json()

    if (appUser.role === 'club_admin' && clientId !== appUser.client_id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    if (!notificationEmail?.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const service = createServiceClient()
    await service
      .from('notification_preferences')
      .upsert({
        client_id:          clientId,
        notification_email: notificationEmail,
        new_purchase_alert: newPurchaseAlert ?? true,
        daily_digest:       dailyDigest ?? false,
        digest_time:        digestTime ?? '08:00',
      }, { onConflict: 'client_id' })

    // Also update the primary notification email on the client record
    await service
      .from('clients')
      .update({ notification_email: notificationEmail })
      .eq('id', clientId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Notification prefs error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
