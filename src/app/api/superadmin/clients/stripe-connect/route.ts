import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateConnectOnboardingLink, verifyStripeOnboarding } from '@/lib/stripe'

// Generate a new Stripe Connect onboarding link for a client
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: appUser } = await supabase
      .from('app_users').select('role').eq('id', user.id).single()
    if (appUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const { clientId } = await req.json()
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

    const service = createServiceClient()
    const { data: client } = await service
      .from('clients')
      .select('id, slug, notification_email, stripe_account_id, stripe_onboarded')
      .eq('id', clientId)
      .single()

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // If already onboarded, just verify
    if (client.stripe_account_id) {
      const onboarded = await verifyStripeOnboarding(client.stripe_account_id)
      if (onboarded && !client.stripe_onboarded) {
        await service.from('clients').update({ stripe_onboarded: true }).eq('id', clientId)
      }
      if (onboarded) {
        return NextResponse.json({ alreadyOnboarded: true })
      }
    }

    // Generate new Connect link
    const result = await generateConnectOnboardingLink(
      client.id,
      client.slug,
      client.notification_email,
    )

    if (!result.url || !result.accountId) {
      return NextResponse.json({ error: result.error ?? 'Failed to generate link' }, { status: 500 })
    }

    // Store the account ID
    await service
      .from('clients')
      .update({ stripe_account_id: result.accountId })
      .eq('id', clientId)

    return NextResponse.json({ url: result.url, accountId: result.accountId })

  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
