import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateMessage, validateFanName, gridRef } from '@/lib/utils'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { squareId, fanName, fanMessage } = await req.json()

    if (!squareId) return NextResponse.json({ error: 'Missing squareId' }, { status: 400 })

    const nameErr = validateFanName(fanName)
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 })

    if (fanMessage) {
      const msgErr = validateMessage(fanMessage)
      if (msgErr) return NextResponse.json({ error: msgErr }, { status: 400 })
    }

    const service = createServiceClient()

    const { data: square } = await service
      .from('squares')
      .select('*, clients(club_name, slug, notification_email)')
      .eq('id', squareId)
      .single()

    if (!square) return NextResponse.json({ error: 'Square not found' }, { status: 404 })

    // Only allow resubmission on previously rejected squares that are still pending
    if (square.status !== 'pending') {
      return NextResponse.json({ error: 'Square is not awaiting resubmission' }, { status: 409 })
    }

    // Update with new content — reset rejection data, back to moderation queue
    await service
      .from('squares')
      .update({
        fan_name:       fanName.trim(),
        fan_message:    fanMessage?.trim() ?? null,
        rejected_at:    null,
        rejection_note: null,
      })
      .eq('id', squareId)

    // Notify club of resubmission
    const ref = gridRef(square.grid_x, square.grid_y)
    const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/board/${square.clients.slug}`

    await sendEmail({
      type:       'club_new_purchase',
      to:         square.clients.notification_email,
      fanName:    fanName.trim(),
      clubName:   square.clients.club_name,
      clubSlug:   square.clients.slug,
      gridRef:    `${ref} (resubmission)`,
      fanMessage: fanMessage?.trim(),
      boardUrl,
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Resubmission error:', err)
    return NextResponse.json({ error: 'Resubmission failed' }, { status: 500 })
  }
}
