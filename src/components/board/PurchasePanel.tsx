'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { X, Lock, CreditCard } from 'lucide-react'
import type { Client } from '@/types'
import { gridRef, validateFanName, validateMessage, validateEmail, formatCurrency } from '@/lib/utils'

interface PurchasePanelProps {
  client:  Client
  gridX:   number
  gridY:   number
  onClose: () => void
  onSuccess: (fanName: string) => void
}

type Step = 'form' | 'paying' | 'success' | 'error'

export default function PurchasePanel({ client, gridX, gridY, onClose, onSuccess }: PurchasePanelProps) {
  const [step,       setStep]       = useState<Step>('form')
  const [fanName,    setFanName]    = useState('')
  const [fanMessage, setFanMessage] = useState('')
  const [fanEmail,   setFanEmail]   = useState('')
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const ref = gridRef(gridX, gridY)

  function validate(): boolean {
    const e: Record<string, string> = {}
    const nameErr = validateFanName(fanName)
    if (nameErr) e.fanName = nameErr
    const emailErr = validateEmail(fanEmail)
    if (emailErr) e.fanEmail = emailErr
    if (fanMessage) {
      const msgErr = validateMessage(fanMessage)
      if (msgErr) e.fanMessage = msgErr
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handlePurchase() {
    if (!validate()) return
    setStep('paying')
    setServerError(null)

    try {
      // Create payment intent via API
      const res = await fetch('/api/purchase/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:   client.id,
          gridX, gridY,
          fanName:    fanName.trim(),
          fanMessage: fanMessage.trim(),
          fanEmail:   fanEmail.trim().toLowerCase(),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? 'Payment setup failed')
      }

      // Load Stripe and confirm payment
      if (!client.stripeAccountId) {
        throw new Error('This campaign is not yet set up to accept payments. Please contact the club.')
      }

      const stripeJs = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        { stripeAccount: client.stripeAccountId }
      )
      if (!stripeJs) throw new Error('Payment system unavailable')

      const { error } = await stripeJs.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url:       `${window.location.origin}/board/${client.slug}/thankyou`,
          payment_method_data: { billing_details: { name: fanName, email: fanEmail } },
        },
        redirect: 'if_required',
      })

      if (error) throw new Error(error.message ?? 'Payment failed')

      setStep('success')
      onSuccess(fanName.trim())

    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('error')
    }
  }

  if (step === 'success') {
    return (
      <div className="animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-medium text-foreground">Square claimed!</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <p className="font-medium text-foreground mb-1">You're on the board, {fanName.split(' ')[0]}!</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Square <strong>{ref}</strong> is reserved. We've sent a confirmation to{' '}
            <strong>{fanEmail}</strong>. Your message will be reviewed within 48 hours.
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
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
          <X size={16} />
        </button>
      </div>

      {step === 'error' && serverError && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Your name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={fanName}
            onChange={e => setFanName(e.target.value)}
            placeholder="e.g. Seán Murphy"
            maxLength={60}
            className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {errors.fanName && <p className="text-xs text-red-500 mt-1">{errors.fanName}</p>}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Email address <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={fanEmail}
            onChange={e => setFanEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {errors.fanEmail && <p className="text-xs text-red-500 mt-1">{errors.fanEmail}</p>}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Your message or memory <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            value={fanMessage}
            onChange={e => setFanMessage(e.target.value)}
            placeholder="e.g. Heineken Cup Final 2006 — the greatest day of my life..."
            maxLength={160}
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            {errors.fanMessage
              ? <p className="text-xs text-red-500">{errors.fanMessage}</p>
              : <span />
            }
            <span className="text-xs text-muted-foreground ml-auto">
              {160 - fanMessage.length} remaining
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Messages are reviewed by {client.clubName} before going live — usually within 48 hours.
          </p>
        </div>
      </div>

      <button
        onClick={handlePurchase}
        disabled={step === 'paying'}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--club-primary)] hover:opacity-90 text-white font-medium text-sm py-2.5 rounded-md transition-opacity disabled:opacity-60"
      >
        {step === 'paying' ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Processing payment…
          </>
        ) : (
          <>
            <Lock size={14} />
            Pay {formatCurrency(client.pricePerSquare, client.currencySymbol, client.currency)} & claim square
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CreditCard size={11} /> Card</span>
        <span>·</span>
        <span>Apple Pay</span>
        <span>·</span>
        <span>Google Pay</span>
        <span>·</span>
        <span className="flex items-center gap-1"><Lock size={10} /> Stripe secure</span>
      </div>
    </div>
  )
}
