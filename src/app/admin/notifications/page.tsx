import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users').select('client_id').eq('id', user.id).single()
  if (!appUser?.client_id) redirect('/auth/login')

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('client_id', appUser.client_id)
    .single()

  const { data: client } = await supabase
    .from('clients')
    .select('notification_email')
    .eq('id', appUser.client_id)
    .single()

  return (
    <NotificationsClient
      clientId={appUser.client_id}
      initial={{
        notificationEmail: prefs?.notification_email ?? client?.notification_email ?? '',
        newPurchaseAlert:  prefs?.new_purchase_alert ?? true,
        dailyDigest:       prefs?.daily_digest       ?? false,
        digestTime:        prefs?.digest_time        ?? '08:00',
      }}
    />
  )
}
