import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateMessage, validateFanName } from '@/lib/utils'
import { sendEmail } from '@/lib/email'
import { gridRef, boardUrl } from '@/lib/utils'

function validToken(provided: string, storedHash: string): boolean {
  const actual = Buffer.from(createHash('sha256').update(provided).digest('hex'))
  const expected = Buffer.from(storedHash)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function POST(req: NextRequest) {
  try {
    const { squareId, token, fanName, fanMessage } = await req.json()
    if (typeof squareId !== 'string' || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid resubmission link' }, { status: 400 })
    }
    if (!await checkRateLimit(req, `resubmit:${squareId}`, 10, 600)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const nameErr = typeof fanName === 'string' ? validateFanName(fanName) : 'Name is required'
    const messageErr = fanMessage ? validateMessage(fanMessage) : null
    if (nameErr || messageErr) {
      return NextResponse.json({ error: nameErr ?? messageErr }, { status: 400 })
    }

    const service = createServiceClient()
    const { data: square } = await service
      .from('squares')
      .select('*, clients(club_name, slug, notification_email)')
      .eq('id', squareId)
      .single()

    if (!square
      || square.status !== 'pending'
      || square.payment_status !== 'paid'
      || !square.rejected_at
      || !square.resubmission_token_hash
      || !validToken(token, square.resubmission_token_hash)) {
      return NextResponse.json({ error: 'This resubmission link is invalid or has expired' }, { status: 403 })
    }

    const { data: updated, error: updateError } = await service
      .from('squares')
      .update({
        fan_name: fanName.trim(),
        fan_message: fanMessage?.trim() || null,
        rejected_at: null,
        rejection_note: null,
        resubmission_token_hash: null,
      })
      .eq('id', squareId)
      .eq('resubmission_token_hash', square.resubmission_token_hash)
      .select('id')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'This link has already been used' }, { status: 409 })
    }

    await sendEmail({
      type: 'club_new_purchase',
      to: square.clients.notification_email,
      fanName: fanName.trim(),
      clubName: square.clients.club_name,
      clubSlug: square.clients.slug,
      gridRef: `${gridRef(square.grid_x, square.grid_y)} (resubmission)`,
      fanMessage: fanMessage?.trim() || undefined,
      boardUrl: boardUrl(square.clients.slug),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resubmission error:', err)
    return NextResponse.json({ error: 'Resubmission failed' }, { status: 500 })
  }
}
