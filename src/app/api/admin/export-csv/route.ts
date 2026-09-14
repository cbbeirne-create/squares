import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown): string {
  let text = String(value ?? '').replace(/\r?\n/g, ' ')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const { data: appUser } = await supabase.from('app_users').select('role, client_id').eq('id', user.id).single()
    if (!appUser?.client_id || appUser.role !== 'club_admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

    const service = createServiceClient()
    const [{ data: client }, { data: squares, error }] = await Promise.all([
      service.from('clients').select('club_name, currency_symbol, price_per_square').eq('id', appUser.client_id).single(),
      service.from('squares')
        .select('grid_x, grid_y, fan_name, fan_email, fan_message, status, purchased_at, published_at')
        .eq('client_id', appUser.client_id)
        .eq('payment_status', 'paid')
        .in('status', ['pending', 'published'])
        .order('payment_confirmed_at', { ascending: true }),
    ])
    if (error) throw error
    if (!client) return NextResponse.json({ error: 'No data found' }, { status: 404 })

    const headers = ['Square ref', 'Fan name', 'Fan email', 'Message', 'Status', 'Purchased date', 'Published date', `Amount (${client.currency_symbol})`]
    const rows = (squares ?? []).map(square => [
      `R${square.grid_y + 1}–C${square.grid_x + 1}`,
      square.fan_name, square.fan_email, square.fan_message, square.status,
      square.purchased_at ? formatDate(square.purchased_at) : '',
      square.published_at ? formatDate(square.published_at) : '',
      client.price_per_square,
    ])
    const paidTotal = rows.length * Number(client.price_per_square)
    const csv = [
      [`${client.club_name} — Stadium Squares export`],
      [`Generated`, new Date().toISOString()],
      [`Confirmed revenue`, `${client.currency_symbol}${paidTotal.toFixed(2)}`],
      [],
      headers,
      ...rows,
    ].map(row => row.map(csvCell).join(',')).join('\r\n')

    const safeClub = client.club_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stadium-squares-${safeClub}-${new Date().toISOString().slice(0, 10)}.csv"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('CSV export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
