import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStripeOnboarding } from '@/lib/stripe'
import { Check, AlertTriangle } from 'lucide-react'

interface Props {
  params: { id: string }
}

export default async function StripeCompletePage({ params }: Props) {
  const service = createServiceClient()

  const { data: client } = await service
    .from('clients')
    .select('id, club_name, stripe_account_id, stripe_onboarded')
    .eq('id', params.id)
    .single()

  let onboarded = client?.stripe_onboarded ?? false

  // Verify live with Stripe if not already marked onboarded
  if (client?.stripe_account_id && !onboarded) {
    onboarded = await verifyStripeOnboarding(client.stripe_account_id)
    if (onboarded) {
      await service
        .from('clients')
        .update({ stripe_onboarded: true })
        .eq('id', params.id)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-background border border-border rounded-xl p-8 text-center">
        {onboarded ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={20} className="text-green-600" />
            </div>
            <h1 className="text-lg font-medium text-foreground mb-2">Stripe setup complete</h1>
            <p className="text-sm text-muted-foreground mb-6">
              <strong>{client?.club_name}</strong> has successfully connected their Stripe account.
              Fan payments will now go directly to the club. You can launch their campaign.
            </p>
            <Link
              href={`/superadmin/clients/${params.id}`}
              className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity"
            >
              <Check size={14} /> View client — ready to launch
            </Link>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <h1 className="text-lg font-medium text-foreground mb-2">Stripe setup incomplete</h1>
            <p className="text-sm text-muted-foreground mb-6">
              The Stripe onboarding process wasn't fully completed.
              The club may need to provide additional information before payments can be enabled.
            </p>
            <Link
              href={`/superadmin/clients/${params.id}`}
              className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity"
            >
              Back to client — regenerate link
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
