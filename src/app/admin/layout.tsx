import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, CheckSquare, FileText, Layout, BarChart2, Settings, LogOut } from 'lucide-react'

const NAV = [
  { href: '/admin/moderation',    label: 'Moderation queue',    icon: CheckSquare },
  { href: '/admin/content',       label: 'Promotional content', icon: FileText },
  { href: '/admin/hoardings',     label: 'Hoardings',           icon: Layout },
  { href: '/admin/analytics',     label: 'Analytics',           icon: BarChart2 },
  { href: '/admin/notifications', label: 'Notifications',       icon: Settings },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('name, role, client_id, clients(club_name, slug, status)')
    .eq('id', user.id)
    .single()

  if (!appUser) redirect('/auth/login')

  const client = Array.isArray(appUser.clients) ? appUser.clients[0] : appUser.clients

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Stadium Squares</p>
          <p className="text-sm font-medium text-foreground truncate">{client?.club_name ?? 'Admin'}</p>
          {client?.status && (
            <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
              client.status === 'active'   ? 'bg-green-100 text-green-700' :
              client.status === 'sold_out' ? 'bg-blue-100 text-blue-700' :
              'bg-muted text-muted-foreground'
            }`}>
              {client.status === 'sold_out' ? 'Sold out 🎉' : client.status}
            </span>
          )}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {client?.slug && (
            <Link
              href={`/board/${client.slug}`}
              target="_blank"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LayoutDashboard size={15} />
              View live board ↗
            </Link>
          )}
          <div className="h-px bg-border my-2" />
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-border space-y-0.5">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-foreground truncate">{appUser.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
