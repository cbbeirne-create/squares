import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HoardingsClient } from './HoardingsClient'
import type { Hoarding, Position } from './HoardingsClient'

const POSITIONS: Position[] = ['top', 'bottom', 'left', 'right']

export default async function HoardingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!appUser?.client_id) redirect('/auth/login')

  const { data: rows } = await supabase
    .from('hoardings')
    .select('id, position, logo_url, link_url, bg_color, is_published')
    .eq('client_id', appUser.client_id)
    .order('position')

  const existing = new Map((rows ?? []).map(r => [r.position, r]))

  const hoardings: Hoarding[] = POSITIONS.map(pos => {
    const row = existing.get(pos)
    return row
      ? {
          id:           row.id,
          position:     row.position as Position,
          logo_url:     row.logo_url,
          link_url:     row.link_url,
          bg_color:     row.bg_color,
          is_published: row.is_published,
        }
      : {
          id:           `missing-${pos}`,
          position:     pos,
          logo_url:     null,
          link_url:     null,
          bg_color:     '#1a1a1a',
          is_published: false,
        }
  })

  return <HoardingsClient initialHoardings={hoardings} />
}
