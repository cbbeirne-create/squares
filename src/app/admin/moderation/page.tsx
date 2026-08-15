import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ModerationClient from './ModerationClient'

async function getPendingSquares(clientId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('squares')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .order('purchased_at', { ascending: true })
  return data ?? []
}

export default async function ModerationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  if (!appUser || !appUser.client_id) redirect('/auth/login')

  const pending = await getPendingSquares(appUser.client_id)

  return <ModerationClient initialPending={pending} />
}
