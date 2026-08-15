import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils'
import type { CampaignAnalytics } from '@/types'

async function getAnalytics(clientId: string): Promise<CampaignAnalytics | null> {
  const supabase = createClient()

  const [{ data: stats }, { data: recent }, { data: clientData }] = await Promise.all([
    supabase.from('campaign_analytics').select('*').eq('client_id', clientId).single(),
    supabase.from('squares').select('fan_name, grid_x, grid_y, purchased_at')
      .eq('client_id', clientId).eq('status', 'published')
      .order('published_at', { ascending: false }).limit(10),
    supabase.from('clients').select('currency, currency_symbol, price_per_square').eq('id', clientId).single(),
  ])

  if (!stats || !clientData) return null

  return {
    totalSquares:     stats.total_squares,
    soldSquares:      stats.sold_squares,
    pendingSquares:   stats.pending_squares,
    reservedSquares:  stats.reserved_squares,
    availableSquares: stats.available_squares,
    revenueRaised:    stats.revenue_raised,
    currency:         clientData.currency,
    currencySymbol:   clientData.currency_symbol,
    percentSold:      stats.percent_sold,
    recentPurchases:  (recent ?? []).map(r => ({
      fanName:     r.fan_name,
      gridX:       r.grid_x,
      gridY:       r.grid_y,
      purchasedAt: r.purchased_at,
    })),
    dailyVelocity: [],
  }
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users').select('client_id').eq('id', user.id).single()
  if (!appUser?.client_id) redirect('/auth/login')

  const analytics = await getAnalytics(appUser.client_id)
  if (!analytics) return <p className="p-6 text-muted-foreground">No analytics available yet.</p>

  const a = analytics

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-medium text-foreground">Campaign analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live campaign performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Revenue raised',    value: formatCurrency(a.revenueRaised, a.currencySymbol, a.currency), highlight: true },
          { label: 'Squares sold',      value: a.soldSquares },
          { label: 'Pending approval',  value: a.pendingSquares },
          { label: 'Remaining',         value: a.availableSquares },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="border border-border rounded-xl p-4">
            <p className={`text-2xl font-medium ${highlight ? 'text-green-600' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-foreground">Campaign progress</h2>
          <span className="text-sm font-medium text-foreground">{a.percentSold}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${a.percentSold}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{a.soldSquares} sold</span>
          <span>{a.totalSquares} total</span>
        </div>
      </div>

      {/* Recent purchases */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Recent tributes</h2>
        </div>
        {a.recentPurchases.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5">No approved tributes yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {a.recentPurchases.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                    {p.fanName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.fanName}</p>
                    <p className="text-xs text-muted-foreground">R{p.gridY + 1}–C{p.gridX + 1}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(p.purchasedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <a
          href="/api/admin/export-csv"
          className="text-sm text-muted-foreground border border-border rounded-lg px-4 py-2 hover:bg-muted transition-colors"
        >
          Export CSV for accounts
        </a>
      </div>
    </div>
  )
}
