import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Releases squares that were reserved (status='pending') but never had
// payment confirmed AND are old enough that we can be confident the
// checkout was abandoned rather than just slow.
//
// This exists because payment_intent.payment_failed only fires when a
// payment was actually attempted and declined. A fan who selects a
// square, opens the purchase panel, then simply closes the tab never
// triggers any Stripe webhook at all — nothing releases that square
// without this sweep. Confirmed via architecture review: this was a
// real gap, not a theoretical one, since checkout abandonment is normal
// e-commerce behaviour, not an edge case.
//
// Scheduled via vercel.json to run every 10 minutes. Protected by a
// bearer secret so it can't be triggered by anyone who finds the URL.

const STALE_AFTER_MINUTES = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const cutoff   = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString()

  const { data: released, error } = await supabase
    .from('squares')
    .delete()
    .eq('status', 'pending')
    .is('payment_confirmed_at', null)
    .lt('purchased_at', cutoff)
    .select('id, client_id, grid_x, grid_y')

  if (error) {
    console.error('Stale square sweep failed:', error)
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
  }

  return NextResponse.json({
    success:  true,
    released: released?.length ?? 0,
    squares:  released ?? [],
  })
}
