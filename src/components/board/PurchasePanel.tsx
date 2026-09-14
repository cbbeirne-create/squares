'use client'

import { useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { X, Lock, CreditCard } from 'lucide-react'
import type { Client } from '@/types'
import { gridRef, validateFanName, validateMessage, validateEmail, formatCurrency } from '@/lib/utils'

interface PurchasePanelProps {
  client: Client
  gridX: number
  gridY: number
  onClose: () => void
  onSuccess: (fanName: string) => void
}

interface Details {
  fanName: string
  fanMessage: string
  fanEmail: string
}

function PaymentForm({
  client,
  details,
  onClose,
  onSuccess,
}: {
  client: Client
  details: Details
  onClose: () => void
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmPayment() {
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/board/${client.slug}/thankyou`,
        payment_method_data: {
          billing_details: {
            name: details.fanName,
            email: details.fanEmail,
          },
        },
      },
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }

    if (result.paymentIntent?.status === 'succeeded'
      || result.paymentIntent?.status === 'processing') {
      onSuccess()
      return
    }

    setError('Payment was not completed. Please try again.')
    setSubmitting(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-foreground">Secure payment</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete payment to reserve your square
          </p>
        </div>
        <button onClick={onClose} aria-label="Close payment panel" className="p-2 -m-2 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PaymentElement options={{ layout: 'tabs' }} />

      <button
        onClick={confirmPayment}
        disabled={!stripe || !elements || submitting}
        className="w-full min-h-11 mt-4 flex items-center justify-center gap-2 bg-[var(--club-primary)] hover:opacity-90 text-white font-medium text-sm px-4 py-2.5 rounded-md transition-opacity disabled:opacity-60"
      >
        {submitting ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Confirming payment…
          </>
        ) : (
          <>
            <Lock size={14} />
            Pay {formatCurrency(client.pricePerSquare, client.currencySymbol, client.currency)}
          </>
        )}
      </button>
    </div>
  )
}

export default function PurchasePanel({
  client,
  gridX,
  gridY,
  onClose,
  onSuccess,
}: PurchasePanelProps) {
  const [step, setStep] = useState<'form' | 'creating' | 'payment' | 'success'>('form')
  const [details, setDetails] = useState<Details>({ fanName: '', fanMessage: '', fanEmail: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const ref = gridRef(gridX, gridY)

  const stripePromise = useMemo(() => {
    if (!client.stripeAccountId) return null
    return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
      stripeAccount: client.stripeAccountId,
    })
  }, [client.stripeAccountId])

  function update(key: keyof Details, value: string) {
    setDetails(previous => ({ ...previous, [key]: value }))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    const nameError = validateFanName(details.fanName)
    const emailError = validateEmail(details.fanEmail)
    const messageError = details.fanMessage ? validateMessage(details.fanMessage) : null
    if (nameError) next.fanName = nameError
    if (emailError) next.fanEmail = emailError
    if (messageError) next.fanMessage = messageError
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function createPayment() {
    if (!validate()) return
    if (!client.stripeAccountId || !stripePromise) {
      setServerError('This campaign is not yet set up to accept payments.')
      return
    }

    setStep('creating')
    setServerError(null)

    try {
      const response = await fetch('/api/purchase/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          gridX,
          gridY,
          fanName: details.fanName.trim(),
          fanMessage: details.fanMessage.trim(),
          fanEmail: details.fanEmail.trim().toLowerCase(),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error ?? 'Payment setup failed')
      }
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('form')
    }
  }

  function paymentSucceeded() {
    setStep('success')
    onSuccess(details.fanName.trim())
  }

  if (step === 'payment' && clientSecret && stripePromise) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: 'stripe' },
        }}
      >
        <PaymentForm
          client={client}
          details={details}
          onClose={onClose}
          onSuccess={paymentSucceeded}
        />
      </Elements>
    )
  }

  if (step === 'success') {
    return (
      <div className="animate-fade-in" role="status">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-medium text-foreground">Payment submitted</h3>
          <button onClick={onClose} aria-label="Close purchase panel" className="p-2 -m-2 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <p className="font-medium text-foreground mb-1">Thank you, {details.fanName.split(' ')[0]}!</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Square <strong>{ref}</strong> is reserved while Stripe confirms payment.
            We will email <strong>{details.fanEmail}</strong> after confirmation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-foreground">Claim square {ref}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatCurrency(client.pricePerSquare, client.currencySymbol, client.currency)} — permanent tribute
          </p>
        </div>
        <button onClick={onClose} aria-label="Close purchase panel" className="p-2 -m-2 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      {serverError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="fan-name" className="block text-xs text-muted-foreground mb-1">Your name <span className="text-red-500">*</span></label>
          <input id="fan-name" type="text" autoComplete="name" value={details.fanName} onChange={e => update('fanName', e.target.value)} maxLength={60}
            className="w-full min-h-11 text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.fanName && <p className="text-xs text-red-500 mt-1">{errors.fanName}</p>}
        </div>

        <div>
          <label htmlFor="fan-email" className="block text-xs text-muted-foreground mb-1">Email address <span className="text-red-500">*</span></label>
          <input id="fan-email" type="email" autoComplete="email" value={details.fanEmail} onChange={e => update('fanEmail', e.target.value)}
            className="w-full min-h-11 text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.fanEmail && <p className="text-xs text-red-500 mt-1">{errors.fanEmail}</p>}
        </div>

        <div>
          <label htmlFor="fan-message" className="block text-xs text-muted-foreground mb-1">Your message or memory <span className="text-muted-foreground/60">(optional)</span></label>
          <textarea id="fan-message" value={details.fanMessage} onChange={e => update('fanMessage', e.target.value)} maxLength={160} rows={3}
            className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-red-500">{errors.fanMessage}</span>
            <span className="text-xs text-muted-foreground">{160 - details.fanMessage.length} remaining</span>
          </div>
        </div>
      </div>

      <button
        onClick={createPayment}
        disabled={step === 'creating'}
        className="w-full min-h-11 mt-4 flex items-center justify-center gap-2 bg-[var(--club-primary)] hover:opacity-90 text-white font-medium text-sm px-4 py-2.5 rounded-md transition-opacity disabled:opacity-60"
      >
        {step === 'creating' ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Reserving square…
          </>
        ) : (
          <>
            <Lock size={14} />
            Continue to secure payment
          </>
        )}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CreditCard size={11} /> Available methods shown securely by Stripe</span>
      </div>
    </div>
  )
}
