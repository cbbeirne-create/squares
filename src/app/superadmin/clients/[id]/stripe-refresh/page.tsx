'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { RefreshCw, Copy, Check } from 'lucide-react'

export default function StripeRefreshPage() {
  const params   = useParams<{ id: string }>()
  const [loading, setLoading]   = useState(false)
  const [link,    setLink]      = useState<string | null>(null)
  const [copied,  setCopied]    = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  async function regenerate() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/superadmin/clients/stripe-connect', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clientId: params.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.alreadyOnboarded) {
        setLink(null)
        setError('This club has already completed Stripe onboarding.')
        return
      }
      setLink(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate link')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-background border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={20} className="text-amber-600" />
        </div>

        <h1 className="text-lg font-medium text-foreground mb-2">
          Stripe onboarding link expired
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          The Stripe Connect onboarding link has expired. Generate a fresh one and send it to the club.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 mb-4 text-left">
            {error}
          </div>
        )}

        {link ? (
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
              <code className="text-xs flex-1 truncate font-mono text-muted-foreground">{link}</code>
              <button
                onClick={copy}
                className="flex items-center gap-1 text-xs text-foreground hover:text-primary transition-colors flex-shrink-0"
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              This link expires in 24 hours. Send it to the club immediately.
            </p>
          </div>
        ) : (
          <button
            onClick={regenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-background border-t-transparent rounded-full" /> Generating…</>
              : <><RefreshCw size={14} /> Generate new link</>
            }
          </button>
        )}

        <div className="mt-6">
          <a
            href={`/superadmin/clients/${params.id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to client
          </a>
        </div>
      </div>
    </div>
  )
}
