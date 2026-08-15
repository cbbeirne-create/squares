import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createPurchaseIntent } from '@/lib/stripe'
import { sendEmail } from '@/lib/email'
import { validateFanName, validateMessage, validateEmail, gridRef } from '@/lib/utils'
import type { Client, PurchaseIntent } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, gridX, gridY, fanName, fanMessage, fanEmail } = body

    // Input validation
    const nameErr = validateFanName(fanName)
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 })

    const emailErr = validateEmail(fanEmail)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })

    if (fanMessage) {
      const msgErr = validateMessage(fanMessage)
      if (msgErr) return NextResponse.json({ error: msgErr }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Load client
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('status', 'active')
      .single()

    if (clientErr || !clientData) {
      return NextResponse.json({ error: 'Campaign not found or not active' }, { status: 404 })
    }

    // Reserve the square FIRST, before calling Stripe.
    // This means a losing race (two fans clicking the same square at once)
    // fails fast on the DB unique constraint and never wastes a Stripe API
    // call or creates an orphaned PaymentIntent on the club's account.
    const { data: square, error: insertErr } = await supabase
      .from('squares')
      .insert({
        client_id:    clientId,
        grid_x:       gridX,
        grid_y:       gridY,
        status:       'pending',
        fan_name:     fanName,
        fan_message:  fanMessage || null,
        fan_email:    fanEmail,
        purchased_at: new Date().toISOString(),
        // payment_confirmed_at stays null until the Stripe webhook confirms
        // payment_intent.succeeded. Null here is the source of truth for
        // "not yet paid" — used by both failed-payment cleanup and the
        // stale-square TTL sweep for abandoned checkouts.
      })
      .select('id')
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'This square has already been claimed. Please choose another.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to reserve square' }, { status: 500 })
    }

    // Build client object for Stripe
    const client: Client = {
      id:               clientData.id,
      slug:             clientData.slug,
      clubName:         clientData.club_name,
      sport:            clientData.sport,
      status:           clientData.status,
      theme:            { primaryColor: clientData.primary_color, secondaryColor: clientData.secondary_color, accentColor: clientData.accent_color },
      standGraphics:    { top: null, bottom: null, left: null, right: null },
      hoardings:        [],
      promo:            { headline: '', subheadline: '', body: '' },
      gridCols:         clientData.grid_cols,
      gridRows:         clientData.grid_rows,
      pricePerSquare:   clientData.price_per_square,
      currency:         clientData.currency,
      currencySymbol:   clientData.currency_symbol,
      notificationEmail: clientData.notification_email,
      stripeAccountId:  clientData.stripe_account_id,
      stripeOnboarded:  clientData.stripe_onboarded,
      platformFeeMonthly: clientData.platform_fee_monthly,
      archiveFeeMonthly:  clientData.archive_fee_monthly,
      launchedAt:       clientData.launched_at,
      soldOutAt:        clientData.sold_out_at,
      createdAt:        clientData.created_at,
    }

    const intent: PurchaseIntent = { clientId, gridX, gridY, fanName, fanMessage, fanEmail }
    const result = await createPurchaseIntent(intent, client)

    if (!result.success || !result.clientSecret || !result.paymentIntentId) {
      // Stripe failed after we'd already reserved the square — release it
      // immediately rather than leaving a dead square with no payment path.
      await supabase.from('squares').delete().eq('id', square.id)
      return NextResponse.json({ error: result.error ?? 'Payment setup failed' }, { status: 500 })
    }

    // Link the real PaymentIntent ID to the square. This is purely for
    // traceability (support lookups, Stripe dashboard cross-reference) —
    // payment_confirmed_at, set only by the webhook, is what actually
    // gates whether this square is considered paid.
    await supabase
      .from('squares')
      .update({ stripe_payment_intent_id: result.paymentIntentId })
      .eq('id', square.id)

    const ref = gridRef(gridX, gridY)
    const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/board/${clientData.slug}`

    // Send fan confirmation email (non-blocking)
    sendEmail({
      type:        'purchase_confirmation',
      to:          fanEmail,
      fanName,
      clubName:    clientData.club_name,
      clubSlug:    clientData.slug,
      gridRef:     ref,
      fanMessage,
      boardUrl,
    }).catch(console.error)

    // Send club notification (non-blocking)
    if (clientData.notification_email) {
      sendEmail({
        type:        'club_new_purchase',
        to:          clientData.notification_email,
        fanName,
        clubName:    clientData.club_name,
        clubSlug:    clientData.slug,
        gridRef:     ref,
        fanMessage,
        boardUrl,
      }).catch(console.error)
    }

    return NextResponse.json({
      success:      true,
      clientSecret: result.clientSecret,
      squareId:     square.id,
    })

  } catch (err) {
    console.error('Purchase intent error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
