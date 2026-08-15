import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

// This route reads auth cookies on every request, so it can never be
// statically prerendered. Declaring this explicitly stops Next.js
// logging a "couldn't be rendered statically" diagnostic at build time —
// harmless, but easy to mistake for a real error in the build log.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users').select('role, client_id').eq('id', user.id).single()
    if (!appUser?.client_id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const service = createServiceClient()

    const { data: client } = await service
      .from('clients')
      .select('club_name, currency_symbol, price_per_square')
      .eq('id', appUser.client_id)
      .single()

    const { data: squares } = await service
      .from('squares')
      .select('grid_x, grid_y, fan_name, fan_email, fan_message, status, purchased_at, published_at')
      .eq('client_id', appUser.client_id)
      .in('status', ['pending', 'published'])
      .order('purchased_at', { ascending: true })

    if (!squares || !client) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    // Build CSV
    const headers = [
      'Square ref',
      'Fan name',
      'Fan email',
      'Message',
      'Status',
      'Purchased date',
      'Published date',
      `Amount (${client.currency_symbol})`,
    ]

    const rows = squares.map(s => [
      `R${s.grid_y + 1}–C${s.grid_x + 1}`,
      s.fan_name ?? '',
      s.fan_email ?? '',
      s.fan_message ? `"${s.fan_message.replace(/"/g, '""')}"` : '',
      s.status,
      s.purchased_at ? formatDate(s.purchased_at) : '',
      s.published_at ? formatDate(s.published_at) : '',
      client.price_per_square,
    ])

    const totalRevenue = squares
      .filter(s => s.status === 'published')
      .length * Number(client.price_per_square)

    const csv = [
      `# ${client.club_name} — Stadium Squares export`,
      `# Generated: ${new Date().toISOString()}`,
      `# Total revenue: ${client.currency_symbol}${totalRevenue.toFixed(2)}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n')

    const filename = `stadium-squares-${client.club_name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (err) {
    console.error('CSV export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
