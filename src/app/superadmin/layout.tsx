import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, Plus, BarChart2, Settings, LogOut, Shield } from 'lucide-react'

const NAV = [
  { href: '/superadmin/clients',    label: 'All clients',    icon: Users },
  { href: '/superadmin/onboarding', label: 'New client',     icon: Plus },
  { href: '/superadmin/analytics',  label: 'Platform stats', icon: BarChart2 },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users').select('name, role').eq('id', user.id).single()

  if (!appUser || appUser.role !== 'super_admin') redirect('/auth/login')

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r border-border flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-primary" />
            <p className="text-xs text-primary font-medium">Super Admin</p>
          </div>
          <p className="text-sm font-medium text-foreground">Stadium Squares</p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
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
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
