import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { gridRef, boardUrl } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase     = createClient()
    const serviceClient = createServiceClient()

    // Verify authenticated club admin or super admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    if (!appUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { squareId, action, rejectionNote } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Load square with client info
    const { data: square, error: sqErr } = await serviceClient
      .from('squares')
      .select('*, clients(club_name, slug, notification_email)')
      .eq('id', squareId)
      .single()

    if (sqErr || !square) {
      return NextResponse.json({ error: 'Square not found' }, { status: 404 })
    }

    // Club admins can only moderate their own client's squares
    if (appUser.role === 'club_admin' && square.client_id !== appUser.client_id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    if (square.status !== 'pending') {
      return NextResponse.json({ error: 'Square is not pending moderation' }, { status: 409 })
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      await serviceClient
        .from('squares')
        .update({ status: 'published', published_at: now, rejection_note: null })
        .eq('id', squareId)

      // Send approval email to fan
      await sendEmail({
        type:       'square_approved',
        to:         square.fan_email,
        fanName:    square.fan_name,
        clubName:   square.clients.club_name,
        clubSlug:   square.clients.slug,
        gridRef:    gridRef(square.grid_x, square.grid_y),
        fanMessage: square.fan_message,
        boardUrl:   boardUrl(square.clients.slug),
      })

      // TODO: Generate and store share card image

    } else {
      await serviceClient
        .from('squares')
        .update({
          status:           'pending',  // stays pending awaiting resubmission
          rejected_at:      now,
          rejection_note:   rejectionNote ?? null,
          rejection_count:  square.rejection_count + 1,
        })
        .eq('id', squareId)

      await sendEmail({
        type:          'square_rejected',
        to:            square.fan_email,
        fanName:       square.fan_name,
        clubName:      square.clients.club_name,
        clubSlug:      square.clients.slug,
        gridRef:       gridRef(square.grid_x, square.grid_y),
        rejectionNote: rejectionNote ?? null,
        boardUrl:      boardUrl(square.clients.slug),
      })
    }

    // Log moderation action
    await serviceClient
      .from('moderation_log')
      .insert({
        square_id:      squareId,
        client_id:      square.client_id,
        admin_id:       user.id,
        action,
        rejection_note: rejectionNote ?? null,
      })

    // Check if board is now sold out
    if (action === 'approve') {
      const { data: analytics } = await serviceClient
        .from('campaign_analytics')
        .select('available_squares, sold_squares, total_squares')
        .eq('client_id', square.client_id)
        .single()

      if (analytics && analytics.available_squares === 0) {
        await serviceClient
          .from('clients')
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
