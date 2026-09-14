import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  if (!await checkRateLimit(req, `board:${params.slug}`, 240, 600)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id')
    .eq('slug', params.slug)
    .in('status', ['active', 'sold_out'])
    .single()

  if (!client) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  const { data: rows, error } = await service
    .from('squares')
    .select('id, client_id, grid_x, grid_y, status, payment_status, fan_name, fan_message, purchased_at, published_at, is_reserved, reserved_label')
    .eq('client_id', client.id)
    .or('is_reserved.eq.true,payment_status.in.(payment_pending,paid)')

  if (error) {
    console.error('Public board refresh failed:', error)
    return NextResponse.json({ error: 'Board unavailable' }, { status: 500 })
  }

  const squares = (rows ?? []).map(square => {
    const isPublicTribute = square.status === 'published' && square.payment_status === 'paid'
    return {
      id: square.id,
      clientId: square.client_id,
      gridX: square.grid_x,
      gridY: square.grid_y,
      status: isPublicTribute ? 'published' : square.is_reserved ? 'reserved' : 'pending',
      fanName: isPublicTribute ? square.fan_name : null,
      fanMessage: isPublicTribute ? square.fan_message : null,
      fanEmail: null,
      purchasedAt: isPublicTribute ? square.purchased_at : null,
      publishedAt: isPublicTribute ? square.published_at : null,
      rejectedAt: null,
      stripePaymentIntentId: null,
      isReserved: square.is_reserved,
      reservedLabel: square.is_reserved ? square.reserved_label : null,
    }
  })

  return NextResponse.json(
    { squares },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
