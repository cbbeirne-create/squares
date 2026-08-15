'use client'

import { useState } from 'react'
import { Check, Eye } from 'lucide-react'

interface ContentForm {
  promoHeadline:    string
  promoSubheadline: string
  promoBody:        string
  pricePerSquare:   number
  currencySymbol:   string
  currency:         string
}

interface Props {
  initial: ContentForm
  clientId: string
}

function PreviewCard({ form }: { form: ContentForm }) {
  return (
    <div className="rounded-xl p-4 text-white" style={{ background: '#8B0000' }}>
      <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Live preview</div>
      <h2 className="text-base font-medium leading-snug mb-1">{form.promoHeadline || 'Your headline here'}</h2>
      <p className="text-sm text-white/70 leading-relaxed mb-3">{form.promoBody || 'Your campaign description here.'}</p>
      <div className="flex gap-2">
        {['Claimed', 'Remaining', `${form.currencySymbol}${form.pricePerSquare} / sq`].map(l => (
          <div key={l} className="bg-black/25 rounded-lg px-2.5 py-1.5 text-center">
            <div className="text-xs text-white/60">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ContentEditorClient({ initial, clientId }: Props) {
  const [form,    setForm]    = useState<ContentForm>(initial)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  function update(key: keyof ContentForm, value: string | number) {
    setSaved(false)
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/content/update', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clientId, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Promotional content</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit the text and pricing shown to fans on your board
          </p>
        </div>
        <button
          onClick={() => setPreview(p => !p)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
        >
          <Eye size={14} />
          {preview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      {preview && <PreviewCard form={form} />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden bg-background divide-y divide-border">

        {/* Headline */}
        <div className="p-5">
          <label className="block text-sm font-medium text-foreground mb-1">
            Headline
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            The main call-to-action shown above the board. Keep it short and emotive.
          </p>
          <input
            type="text"
            value={form.promoHeadline}
            onChange={e => update('promoHeadline', e.target.value)}
            maxLength={80}
            placeholder="Own your place in history"
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">
            {80 - form.promoHeadline.length} characters remaining
          </div>
        </div>

        {/* Subheadline */}
        <div className="p-5">
          <label className="block text-sm font-medium text-foreground mb-1">
            Subheadline
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            A short supporting line shown beneath the headline.
          </p>
          <input
            type="text"
            value={form.promoSubheadline}
            onChange={e => update('promoSubheadline', e.target.value)}
            maxLength={120}
            placeholder="Claim a square. Leave your mark forever."
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">
            {120 - form.promoSubheadline.length} characters remaining
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="block text-sm font-medium text-foreground mb-1">
            Campaign description
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Explain what this campaign means to your club and why fans should get involved.
            This is your voice — make it personal.
          </p>
          <textarea
            value={form.promoBody}
            onChange={e => update('promoBody', e.target.value)}
            maxLength={400}
            rows={5}
            placeholder="Every square on this board is a supporter of our club. Purchase yours, leave your name and a personal memory — a great match, a tribute to someone special, or simply your pride in the jersey."
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <div className="text-right text-xs text-muted-foreground mt-1">
            {400 - form.promoBody.length} characters remaining
          </div>
        </div>

        {/* Pricing */}
        <div className="p-5">
          <label className="block text-sm font-medium text-foreground mb-1">
            Price per square
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            The price displayed to fans. Changing this does not affect already-purchased squares.
            Contact us to update your Stripe payment amounts.
          </p>
          <div className="flex gap-3 items-center">
            <select
              value={form.currency}
              onChange={e => {
                const sym = e.target.value === 'EUR' ? '€' : e.target.value === 'GBP' ? '£' : '$'
                update('currency', e.target.value)
                update('currencySymbol', sym)
              }}
              className="text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {form.currencySymbol}
              </span>
              <input
                type="number"
                min={1}
                max={999}
                step={0.01}
                value={form.pricePerSquare}
                onChange={e => update('pricePerSquare', parseFloat(e.target.value))}
                className="w-full pl-7 pr-3 py-2.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Save button */}
      <div className="flex items-center justify-between">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <Check size={14} /> Saved successfully
          </span>
        )}
        {!saved && <span />}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving
            ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full" /> Saving…</>
            : <><Check size={14} /> Save changes</>
          }
        </button>
      </div>
    </div>
  )
}
