import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, ExternalLink, ChevronRight } from 'lucide-react'

const STATUS_STYLES = {
  setup:    'bg-gray-100 text-gray-600',
  active:   'bg-green-100 text-green-700',
  sold_out: 'bg-blue-100 text-blue-700',
  archived: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS = {
  setup:    'Setup',
  active:   'Active',
  sold_out: 'Sold out',
  archived: 'Archived',
}

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: appUser } = await supabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (appUser?.role !== 'super_admin') redirect('/auth/login')

  // Get all clients with analytics
  const { data: clients } = await supabase
    .from('campaign_analytics')
    .select('*')
    .order('client_id')

  const { data: clientDetails } = await supabase
    .from('clients')
    .select('id, slug, club_name, sport, status, currency_symbol, price_per_square, stripe_onboarded, created_at, launched_at')
    .order('created_at', { ascending: false })

  const analyticsMap = new Map((clients ?? []).map(a => [a.client_id, a]))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-foreground">All clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientDetails?.length ?? 0} clubs on the platform
          </p>
        </div>
        <Link
          href="/superadmin/onboarding"
          className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> New client
        </Link>
      </div>

      {/* Platform summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: 'Total revenue across platform',
            value: formatCurrency(
              (clients ?? []).reduce((sum, a) => sum + Number(a.revenue_raised), 0),
              '€', 'EUR'
            ),
          },
          {
            label: 'Total squares sold',
            value: (clients ?? []).reduce((sum, a) => sum + Number(a.sold_squares), 0).toLocaleString(),
          },
          {
            label: 'Active campaigns',
            value: (clientDetails ?? []).filter(c => c.status === 'active').length,
          },
        ].map(({ label, value }) => (
          <div key={label} className="border border-border rounded-xl p-4">
            <p className="text-xl font-medium text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Clients table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {(clientDetails ?? []).map(c => {
            const analytics = analyticsMap.get(c.id)
            const pct = analytics
              ? Math.round((Number(analytics.sold_squares) / Number(analytics.total_squares)) * 100)
              : 0

            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                {/* Club info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground">{c.club_name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[c.status as keyof typeof STATUS_STYLES]}`}>
                      {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]}
                    </span>
                    {!c.stripe_onboarded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                        Stripe pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.slug}</span>
                    <span>·</span>
                    <span className="capitalize">{c.sport}</span>
                    <span>·</span>
                    <span>{c.currency_symbol}{c.price_per_square}/sq</span>
                    {c.launched_at && <>
                      <span>·</span>
                      <span>Launched {formatDate(c.launched_at)}</span>
                    </>}
                  </div>
                </div>

                {/* Progress */}
                {analytics && (
                  <div className="w-32 flex-shrink-0">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{analytics.sold_squares} sold</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-1">
                      {c.currency_symbol}{Number(analytics.revenue_raised).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/board/${c.slug}`}
                    target="_blank"
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="View live board"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <Link
                    href={`/superadmin/clients/${c.id}`}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
