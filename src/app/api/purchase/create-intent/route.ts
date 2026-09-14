import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createPurchaseIntent, stripe } from '@/lib/stripe'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateFanName, validateMessage, validateEmail } from '@/lib/utils'
import type { Client, PurchaseIntent } from '@/types'

const RESERVATION_MINUTES = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, gridX, gridY, fanName, fanMessage, fanEmail } = body

    if (typeof clientId !== 'string'
      || !Number.isInteger(gridX)
      || !Number.isInteger(gridY)
      || typeof fanName !== 'string'
      || typeof fanEmail !== 'string'
      || (fanMessage != null && typeof fanMessage !== 'string')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const name = fanName.trim()
    const email = fanEmail.trim().toLowerCase()
    const message = fanMessage?.trim() || ''

    const nameErr = validateFanName(name)
    const emailErr = validateEmail(email)
    const msgErr = message ? validateMessage(message) : null
    if (nameErr || emailErr || msgErr) {
      return NextResponse.json({ error: nameErr ?? emailErr ?? msgErr }, { status: 400 })
    }

    if (!await checkRateLimit(req, `purchase:${clientId}`)) {
      return NextResponse.json(
        { error: 'Too many purchase attempts. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': '600' } },
      )
    }

    const service = createServiceClient()
    const { data: clientData, error: clientErr } = await service
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('status', 'active')
      .single()

    if (clientErr || !clientData) {
      return NextResponse.json({ error: 'Campaign not found or not active' }, { status: 404 })
    }

    if (gridX < 0 || gridX >= clientData.grid_cols || gridY < 0 || gridY >= clientData.grid_rows) {
      return NextResponse.json({ error: 'Square is outside this campaign grid' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000).toISOString()
    const { data: square, error: insertErr } = await service
      .from('squares')
      .insert({
        client_id: clientId,
        grid_x: gridX,
        grid_y: gridY,
        status: 'pending',
        payment_status: 'payment_pending',
        fan_name: name,
        fan_message: message || null,
        fan_email: email,
        purchased_at: new Date().toISOString(),
        reservation_expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'This square has already been claimed. Please choose another.' },
          { status: 409 },
        )
      }
      console.error('Square reservation failed:', insertErr)
      return NextResponse.json({ error: 'Failed to reserve square' }, { status: 500 })
    }

    const client: Client = {
      id: clientData.id,
      slug: clientData.slug,
      clubName: clientData.club_name,
      sport: clientData.sport,
      status: clientData.status,
      theme: {
        primaryColor: clientData.primary_color,
        secondaryColor: clientData.secondary_color,
        accentColor: clientData.accent_color,
      },
      standGraphics: { top: null, bottom: null, left: null, right: null },
      hoardings: [],
      promo: { headline: '', subheadline: '', body: '' },
      gridCols: clientData.grid_cols,
      gridRows: clientData.grid_rows,
      pricePerSquare: Number(clientData.price_per_square),
      currency: clientData.currency,
      currencySymbol: clientData.currency_symbol,
      notificationEmail: clientData.notification_email,
      stripeAccountId: clientData.stripe_account_id,
      stripeOnboarded: clientData.stripe_onboarded,
      platformFeeMonthly: Number(clientData.platform_fee_monthly),
      archiveFeeMonthly: Number(clientData.archive_fee_monthly),
      launchedAt: clientData.launched_at,
      soldOutAt: clientData.sold_out_at,
      createdAt: clientData.created_at,
    }

    const intent: PurchaseIntent = {
      clientId,
      gridX,
      gridY,
      fanName: name,
      fanMessage: message,
      fanEmail: email,
    }
    const result = await createPurchaseIntent(intent, client, square.id)

    if (!result.success || !result.clientSecret || !result.paymentIntentId) {
      await service.from('squares')
        .delete()
        .eq('id', square.id)
        .eq('payment_status', 'payment_pending')
      return NextResponse.json({ error: result.error ?? 'Payment setup failed' }, { status: 500 })
    }

    const { error: linkError } = await service
      .from('squares')
      .update({ stripe_payment_intent_id: result.paymentIntentId })
      .eq('id', square.id)
      .eq('payment_status', 'payment_pending')

    if (linkError) {
      try {
        await stripe.paymentIntents.cancel(result.paymentIntentId, {}, {
          stripeAccount: client.stripeAccountId!,
        })
      } catch (cancelError) {
        console.error('Failed to cancel orphaned PaymentIntent:', cancelError)
      }
      await service.from('squares').delete().eq('id', square.id)
      return NextResponse.json({ error: 'Payment setup could not be saved. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      squareId: square.id,
      expiresAt,
    })
  } catch (err) {
    console.error('Purchase intent error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
