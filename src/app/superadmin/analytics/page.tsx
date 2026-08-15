import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export const metadata = { title: 'Platform Analytics — Stadium Squares' }

async function getPlatformStats() {
  const service = createServiceClient()

  const [{ data: analytics }, { data: clients }, { data: recent }] = await Promise.all([
    // Aggregate across all clients
    service.from('campaign_analytics').select('*'),
    // Client list with status
    service.from('clients')
      .select('id, slug, club_name, sport, status, currency_symbol, launched_at')
      .order('launched_at', { ascending: false }),
    // Most recent purchases across platform
    service.from('squares')
      .select('fan_name, grid_x, grid_y, purchased_at, clients(club_name, slug)')
      .eq('status', 'published')
      .order('purchased_at', { ascending: false })
      .limit(10),
  ])

  const totals = (analytics ?? []).reduce(
    (acc, a) => ({
      revenue:  acc.revenue  + Number(a.revenue_raised),
      sold:     acc.sold     + Number(a.sold_squares),
      pending:  acc.pending  + Number(a.pending_squares),
      total:    acc.total    + Number(a.total_squares),
    }),
    { revenue: 0, sold: 0, pending: 0, total: 0 }
  )

  const active   = (clients ?? []).filter(c => c.status === 'active').length
  const soldOut  = (clients ?? []).filter(c => c.status === 'sold_out').length
  const setup    = (clients ?? []).filter(c => c.status === 'setup').length

  return { totals, clients: clients ?? [], recent: recent ?? [], active, soldOut, setup, analyticsMap: new Map((analytics ?? []).map(a => [a.client_id, a])) }
}

const STATUS_STYLES: Record<string, string> = {
  setup:    'bg-gray-100 text-gray-600',
  active:   'bg-green-100 text-green-700',
  sold_out: 'bg-blue-100 text-blue-700',
  archived: 'bg-amber-100 text-amber-700',
}

export default async function SuperAdminAnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (appUser?.role !== 'super_admin') redirect('/admin/moderation')

  const { totals, clients, recent, active, soldOut, setup, analyticsMap } = await getPlatformStats()

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-medium text-foreground">Platform analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue and activity across all Stadium Squares campaigns</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total platform revenue',  value: formatCurrency(totals.revenue, '€', 'EUR'), green: true },
          { label: 'Total squares sold',       value: totals.sold.toLocaleString() },
          { label: 'Pending moderation',       value: totals.pending.toLocaleString() },
          { label: 'Overall completion',       value: totals.total > 0 ? `${Math.round(totals.sold / totals.total * 100)}%` : '—' },
        ].map(({ label, value, green }) => (
          <div key={label} className="border border-border rounded-xl p-4">
            <p className={`text-2xl font-medium ${green ? 'text-green-600' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Client status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active campaigns', value: active,  color: 'text-green-600' },
          { label: 'Sold out',         value: soldOut, color: 'text-blue-600' },
          { label: 'In setup',         value: setup,   color: 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border rounded-xl p-4 text-center">
            <p className={`text-3xl font-medium ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-client breakdown */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Per-campaign breakdown</h2>
        </div>
        <div className="divide-y divide-border">
          {clients.map(c => {
            const a    = analyticsMap.get(c.id)
            const sold = Number(a?.sold_squares ?? 0)
            const tot  = Number(a?.total_squares ?? 1)
            const rev  = Number(a?.revenue_raised ?? 0)
            const pct  = Math.round(sold / tot * 100)

            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{c.club_name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[c.status]}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{c.sport}</span>
                  </div>
                  {c.launched_at && (
                    <p className="text-xs text-muted-foreground">Launched {formatDate(c.launched_at)}</p>
                  )}
                </div>

                <div className="w-36 flex-shrink-0 hidden sm:block">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{sold} sold</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    {c.currency_symbol ?? '€'}{rev.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={`/board/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="View board"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <Link
                    href={`/superadmin/clients/${c.id}`}
                    className="text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent purchases across platform */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Recent tributes — all campaigns</h2>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5">No approved tributes yet across any campaign.</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((r, i) => {
              const club = Array.isArray(r.clients) ? r.clients[0] : r.clients
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                      {r.fan_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.fan_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {club?.club_name} · R{r.grid_y + 1}–C{r.grid_x + 1}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.purchased_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
