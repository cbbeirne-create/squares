import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { gridRef, boardUrl } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const service = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, client_id')
      .eq('id', user.id)
      .single()
    if (!appUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { squareId, action, rejectionNote } = await req.json()
    if (typeof squareId !== 'string' || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (action === 'reject' && (typeof rejectionNote !== 'string' || !rejectionNote.trim())) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    }

    const { data: square, error: squareError } = await service
      .from('squares')
      .select('*, clients(club_name, slug)')
      .eq('id', squareId)
      .single()

    if (squareError || !square) {
      return NextResponse.json({ error: 'Square not found' }, { status: 404 })
    }
    if (appUser.role === 'club_admin' && square.client_id !== appUser.client_id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }
    if (square.status !== 'pending' || square.payment_status !== 'paid' || !square.payment_confirmed_at) {
      return NextResponse.json({ error: 'Only paid squares awaiting moderation can be reviewed' }, { status: 409 })
    }

    const now = new Date().toISOString()
    let resubmissionUrl: string | undefined
    let tokenHash: string | null = null

    if (action === 'reject') {
      const token = randomBytes(32).toString('base64url')
      tokenHash = createHash('sha256').update(token).digest('hex')
      resubmissionUrl = `${boardUrl(square.clients.slug)}/resubmit?square=${encodeURIComponent(squareId)}&token=${encodeURIComponent(token)}`
    }

    const updates = action === 'approve'
      ? {
          status: 'published',
          published_at: now,
          rejected_at: null,
          rejection_note: null,
          resubmission_token_hash: null,
        }
      : {
          rejected_at: now,
          rejection_note: rejectionNote.trim(),
          rejection_count: square.rejection_count + 1,
          resubmission_token_hash: tokenHash,
        }

    const { data: updated, error: updateError } = await service
      .from('squares')
      .update(updates)
      .eq('id', squareId)
      .eq('status', 'pending')
      .eq('payment_status', 'paid')
      .select('id')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Square changed while it was being reviewed' }, { status: 409 })
    }

    const { error: logError } = await service.from('moderation_log').insert({
      square_id: squareId,
      client_id: square.client_id,
      admin_id: user.id,
      action,
      rejection_note: action === 'reject' ? rejectionNote.trim() : null,
    })
    if (logError) console.error('Moderation log failed:', logError)

    await sendEmail({
      type: action === 'approve'
        ? (square.rejection_count > 0 ? 'resubmission_approved' : 'square_approved')
        : 'square_rejected',
      to: square.fan_email,
      fanName: square.fan_name,
      clubName: square.clients.club_name,
      clubSlug: square.clients.slug,
      gridRef: gridRef(square.grid_x, square.grid_y),
      fanMessage: square.fan_message ?? undefined,
      rejectionNote: action === 'reject' ? rejectionNote.trim() : undefined,
      boardUrl: resubmissionUrl ?? boardUrl(square.clients.slug),
    })

    if (action === 'approve') {
      const { data: analytics } = await service
        .from('campaign_analytics')
        .select('available_squares')
        .eq('client_id', square.client_id)
        .single()

      if (Number(analytics?.available_squares) === 0) {
        await service.from('clients')
          .update({ status: 'sold_out', sold_out_at: now })
          .eq('id', square.client_id)
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (err) {
    console.error('Moderation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
