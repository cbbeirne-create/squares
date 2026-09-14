import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, CheckSquare, FileText, Layout, BarChart2, Settings, LogOut, Menu } from 'lucide-react'

const NAV = [
  { href: '/admin/moderation', label: 'Moderation queue', icon: CheckSquare },
  { href: '/admin/content', label: 'Promotional content', icon: FileText },
  { href: '/admin/hoardings', label: 'Hoardings', icon: Layout },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/notifications', label: 'Notifications', icon: Settings },
]

function Navigation({ slug }: { slug?: string }) {
  return (
    <nav className="space-y-1 p-2">
      {slug && <Link href={`/board/${slug}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><LayoutDashboard size={16} /> View live board ↗</Link>}
      {NAV.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Icon size={16} /> {label}</Link>)}
    </nav>
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: appUser } = await supabase.from('app_users').select('name, role, client_id, clients(club_name, slug, status)').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'club_admin' || !appUser.client_id) redirect('/auth/login')
  const client = Array.isArray(appUser.clients) ? appUser.clients[0] : appUser.clients

  return (
    <div className="min-h-screen bg-background md:flex">
      <header className="sticky top-0 z-40 border-b border-border bg-background md:hidden">
        <details>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4">
            <div><p className="text-xs text-muted-foreground">Stadium Squares</p><p className="text-sm font-medium">{client?.club_name}</p></div>
            <Menu size={22} aria-label="Open navigation" />
          </summary>
          <div className="border-t border-border"><Navigation slug={client?.slug} /></div>
        </details>
      </header>
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-border md:flex">
        <div className="border-b border-border px-4 py-5"><p className="text-xs text-muted-foreground">Stadium Squares</p><p className="truncate text-sm font-medium">{client?.club_name ?? 'Admin'}</p></div>
        <div className="flex-1"><Navigation slug={client?.slug} /></div>
        <div className="border-t border-border p-2"><div className="px-3 py-2"><p className="truncate text-xs font-medium">{appUser.name}</p><p className="truncate text-[10px] text-muted-foreground">{user.email}</p></div><form action="/api/auth/signout" method="POST"><button type="submit" className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"><LogOut size={16} /> Sign out</button></form></div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}
