import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, Plus, BarChart2, LogOut, Shield, Menu } from 'lucide-react'

const NAV = [
  { href: '/superadmin/clients', label: 'All clients', icon: Users },
  { href: '/superadmin/onboarding', label: 'New client', icon: Plus },
  { href: '/superadmin/analytics', label: 'Platform stats', icon: BarChart2 },
]

function Navigation() {
  return <nav className="space-y-1 p-2">{NAV.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Icon size={16} /> {label}</Link>)}</nav>
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: appUser } = await supabase.from('app_users').select('name, role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'super_admin') redirect('/auth/login')

  return (
    <div className="min-h-screen bg-background md:flex">
      <header className="sticky top-0 z-40 border-b border-border bg-background md:hidden">
        <details>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4">
            <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /><div><p className="text-xs text-primary">Super Admin</p><p className="text-sm font-medium">Stadium Squares</p></div></div>
            <Menu size={22} aria-label="Open navigation" />
          </summary>
          <div className="border-t border-border"><Navigation /></div>
        </details>
      </header>
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-border md:flex">
        <div className="border-b border-border px-4 py-5"><div className="flex items-center gap-2"><Shield size={16} className="text-primary" /><p className="text-xs font-medium text-primary">Super Admin</p></div><p className="mt-1 text-sm font-medium">Stadium Squares</p></div>
        <div className="flex-1"><Navigation /></div>
        <div className="border-t border-border p-2"><div className="px-3 py-2"><p className="truncate text-xs font-medium">{appUser.name}</p><p className="truncate text-[10px] text-muted-foreground">{user.email}</p></div><form action="/api/auth/signout" method="POST"><button type="submit" className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"><LogOut size={16} /> Sign out</button></form></div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}
