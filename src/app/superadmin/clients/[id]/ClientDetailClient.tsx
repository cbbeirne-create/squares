'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  ExternalLink, Copy, Check, Upload, RefreshCw,
  Rocket, Archive, AlertTriangle, Loader
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

type ClientStatus = 'setup' | 'active' | 'sold_out' | 'archived'

interface ClientDetail {
  id:                 string
  slug:               string
  clubName:           string
  sport:              string
  status:             ClientStatus
  primaryColor:       string
  secondaryColor:     string
  accentColor:        string
  standTop:           string | null
  standBottom:        string | null
  standLeft:          string | null
  standRight:         string | null
  gridCols:           number
  gridRows:           number
  pricePerSquare:     number
  currencySymbol:     string
  currency:           string
  notificationEmail:  string
  stripeAccountId:    string | null
  stripeOnboarded:    boolean
  platformFeeMonthly: number
  archiveFeeMonthly:  number
  launchedAt:         string | null
  soldOutAt:          string | null
  createdAt:          string
  analytics: {
    totalSquares:    number
    soldSquares:     number
    pendingSquares:  number
    revenueRaised:   number
    percentSold:     number
  }
}

interface Props {
  client: ClientDetail
}

function StandGraphicUploader({
  position, label, currentUrl, clientSlug, onUploaded,
}: {
  position: 'top' | 'bottom' | 'left' | 'right'
  label: string
  currentUrl: string | null
  clientSlug: string
  onUploaded: (pos: string, url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('clientSlug', clientSlug)
      fd.append('position', position)
      const res  = await fetch('/api/superadmin/stands/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) onUploaded(position, data.url)
    } finally {
      setUploading(false)
    }
  }, [clientSlug, position, onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    maxFiles: 1,
  })

  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
        }`}
      >
        <input {...getInputProps()} />
        {currentUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt={label} className="w-full h-20 object-cover rounded-md" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
              <p className="text-white text-xs font-medium flex items-center gap-1">
                <Upload size={12} /> Replace
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6">
            {uploading
              ? <Loader size={16} className="text-muted-foreground animate-spin" />
              : <><Upload size={16} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {isDragActive ? 'Drop here' : 'Upload stand graphic'}
                </p></>
            }
          </div>
        )}
      </div>
    </div>
  )
}

export function ClientDetailClient({ client: initial }: Props) {
  const [client,          setClient]          = useState(initial)
  const [stripeLoading,   setStripeLoading]   = useState(false)
  const [stripeLink,      setStripeLink]       = useState<string | null>(null)
  const [copiedLink,      setCopiedLink]       = useState(false)
  const [statusLoading,   setStatusLoading]   = useState(false)
  const [toast,           setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function generateStripeLink() {
    setStripeLoading(true)
    try {
      const res  = await fetch('/api/superadmin/clients/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      const data = await res.json()
      if (data.alreadyOnboarded) {
        setClient(c => ({ ...c, stripeOnboarded: true }))
        showToast('Stripe Connect is already fully onboarded')
        return
      }
      if (!res.ok) throw new Error(data.error)
      setStripeLink(data.url)
      if (data.accountId) setClient(c => ({ ...c, stripeAccountId: data.accountId }))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate link', 'error')
    } finally {
      setStripeLoading(false)
    }
  }

  async function copyStripeLink() {
    if (!stripeLink) return
    await navigator.clipboard.writeText(stripeLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function updateStatus(newStatus: ClientStatus) {
    setStatusLoading(true)
    try {
      const res = await fetch('/api/superadmin/clients/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClient(c => ({
        ...c,
        status: newStatus,
        launchedAt: newStatus === 'active' && !c.launchedAt ? new Date().toISOString() : c.launchedAt,
      }))
      showToast(`Status updated to ${newStatus}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error')
    } finally {
      setStatusLoading(false)
    }
  }

  function handleStandUploaded(position: string, url: string) {
    setClient(c => ({
      ...c,
      standTop:    position === 'top'    ? url : c.standTop,
      standBottom: position === 'bottom' ? url : c.standBottom,
      standLeft:   position === 'left'   ? url : c.standLeft,
      standRight:  position === 'right'  ? url : c.standRight,
    }))
    showToast(`${position} stand graphic uploaded`)
  }

  const total   = client.gridCols * client.gridRows
  const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/board/${client.slug}`

  const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
    setup:    { label: 'Setup',    color: 'bg-gray-100 text-gray-600' },
    active:   { label: 'Active',   color: 'bg-green-100 text-green-700' },
    sold_out: { label: 'Sold out', color: 'bg-blue-100 text-blue-700' },
    archived: { label: 'Archived', color: 'bg-amber-100 text-amber-700' },
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-medium text-foreground">{client.clubName}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[client.status].color}`}>
              {STATUS_CONFIG[client.status].label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {client.slug} · {client.sport} · Created {formatDate(client.createdAt)}
          </p>
        </div>
        <a
          href={boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
        >
          <ExternalLink size={13} /> View live board
        </a>
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Revenue raised',   value: formatCurrency(client.analytics.revenueRaised, client.currencySymbol, client.currency), green: true },
          { label: 'Squares sold',     value: client.analytics.soldSquares },
          { label: 'Pending approval', value: client.analytics.pendingSquares },
          { label: 'Campaign progress',value: `${client.analytics.percentSold}%` },
        ].map(({ label, value, green }) => (
          <div key={label} className="border border-border rounded-xl p-4">
            <p className={`text-xl font-medium ${green ? 'text-green-600' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">{client.analytics.soldSquares} of {total} squares sold</span>
          <span className="font-medium text-foreground">{client.analytics.percentSold}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${client.analytics.percentSold}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Max revenue: {formatCurrency(total * client.pricePerSquare, client.currencySymbol, client.currency)}</span>
          <span>{client.currencySymbol}{client.pricePerSquare}/sq · {client.gridCols}×{client.gridRows} grid</span>
        </div>
      </div>

      {/* Stripe Connect */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-sm font-medium text-foreground">Stripe Connect</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fan payments go directly to the club's Stripe account</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            client.stripeOnboarded
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {client.stripeOnboarded ? '✓ Onboarded' : 'Pending setup'}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {client.stripeAccountId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stripe account ID</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{client.stripeAccountId}</code>
            </div>
          )}

          {!client.stripeOnboarded && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate a Stripe Connect onboarding link and send it to the club.
                They'll complete Stripe's setup in their own account.
              </p>

              {stripeLink ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                    <code className="text-xs flex-1 truncate font-mono text-muted-foreground">{stripeLink}</code>
                    <button
                      onClick={copyStripeLink}
                      className="flex items-center gap-1 text-xs text-foreground hover:text-primary transition-colors flex-shrink-0"
                    >
                      {copiedLink ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    This link expires in 24 hours. Send it to {client.notificationEmail} now.
                  </p>
                </div>
              ) : (
                <button
                  onClick={generateStripeLink}
                  disabled={stripeLoading}
                  className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {stripeLoading
                    ? <><Loader size={14} className="animate-spin" /> Generating…</>
                    : <><RefreshCw size={14} /> Generate onboarding link</>
                  }
                </button>
              )}
            </div>
          )}

          {client.stripeOnboarded && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <Check size={14} />
              Club is fully set up on Stripe Connect. Fan payments will go directly to their account.
            </div>
          )}
        </div>
      </div>

      {/* Stand graphics */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Stand graphics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload four stand images — one per side of the stadium. PNG, JPG or WebP, minimum 800px wide.
          </p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <StandGraphicUploader position="top"    label="Top stand"    currentUrl={client.standTop}    clientSlug={client.slug} onUploaded={handleStandUploaded} />
          <StandGraphicUploader position="bottom" label="Bottom stand" currentUrl={client.standBottom} clientSlug={client.slug} onUploaded={handleStandUploaded} />
          <StandGraphicUploader position="left"   label="Left stand"   currentUrl={client.standLeft}   clientSlug={client.slug} onUploaded={handleStandUploaded} />
          <StandGraphicUploader position="right"  label="Right stand"  currentUrl={client.standRight}  clientSlug={client.slug} onUploaded={handleStandUploaded} />
        </div>
      </div>

      {/* Client config summary */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Configuration</h2>
        </div>
        <div className="divide-y divide-border">
          {[
            ['Sport template',     client.sport],
            ['Grid',               `${client.gridCols} × ${client.gridRows} = ${total} squares`],
            ['Price per square',   `${client.currencySymbol}${client.pricePerSquare}`],
            ['Currency',           client.currency],
            ['Notification email', client.notificationEmail],
            ['Platform fee',       `${client.currencySymbol}${client.platformFeeMonthly}/month`],
            ['Archive fee',        `${client.currencySymbol}${client.archiveFeeMonthly}/month`],
            ['Launched',           client.launchedAt ? formatDate(client.launchedAt) : '—'],
            ['Sold out',           client.soldOutAt  ? formatDate(client.soldOutAt)  : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-muted-foreground">Brand colours</span>
            <div className="flex gap-1.5">
              {[client.primaryColor, client.secondaryColor, client.accentColor].map(c => (
                <div key={c} className="w-5 h-5 rounded-full border border-border" style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status controls */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium text-foreground">Campaign controls</h2>
        </div>
        <div className="p-5 space-y-3">
          {client.status === 'setup' && (
            <div className="space-y-3">
              {!client.stripeOnboarded && (
                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  Stripe Connect must be completed before launching. Generate the onboarding link above.
                </div>
              )}
              <button
                onClick={() => updateStatus('active')}
                disabled={statusLoading || !client.stripeOnboarded}
                className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {statusLoading ? <Loader size={14} className="animate-spin" /> : <Rocket size={14} />}
                Launch campaign
              </button>
            </div>
          )}

          {client.status === 'active' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-green-600 font-medium">Campaign is live</span>
              <button
                onClick={() => updateStatus('archived')}
                disabled={statusLoading}
                className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Archive size={13} /> Archive campaign
              </button>
            </div>
          )}

          {client.status === 'sold_out' && (
            <div className="space-y-2">
              <p className="text-sm text-blue-700 font-medium">🎉 Campaign sold out{client.soldOutAt ? ` on ${formatDate(client.soldOutAt)}` : ''}!</p>
              <p className="text-xs text-muted-foreground">
                The board is permanently complete. The club pays the archive fee ({client.currencySymbol}{client.archiveFeeMonthly}/month) to keep it live.
              </p>
              <button
                onClick={() => updateStatus('archived')}
                disabled={statusLoading}
                className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Archive size={13} /> Archive board
              </button>
            </div>
          )}

          {client.status === 'archived' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">This campaign is archived and no longer publicly visible.</p>
              <button
                onClick={() => updateStatus('active')}
                disabled={statusLoading}
                className="flex items-center gap-1.5 text-sm text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Rocket size={13} /> Reactivate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
