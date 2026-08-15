'use client'

import { useState } from 'react'
import { Check, Bell, Mail, Clock } from 'lucide-react'

interface NotifForm {
  notificationEmail: string
  newPurchaseAlert:  boolean
  dailyDigest:       boolean
  digestTime:        string
}

interface Props {
  clientId: string
  initial:  NotifForm
}

export default function NotificationsClient({ clientId, initial }: Props) {
  const [form,   setForm]   = useState<NotifForm>(initial)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  function update<K extends keyof NotifForm>(key: K, value: NotifForm[K]) {
    setSaved(false)
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/notifications', {
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
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-medium text-foreground">Notification settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control how and when you receive alerts about your Stadium Squares campaign
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden bg-background divide-y divide-border">

        {/* Notification email */}
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <Mail size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Notification email address</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All campaign alerts go to this address. Can be different from your login email —
                for example, a shared club inbox.
              </p>
            </div>
          </div>
          <input
            type="email"
            value={form.notificationEmail}
            onChange={e => update('notificationEmail', e.target.value)}
            placeholder="commercial@yourclub.ie"
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* New purchase alerts */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bell size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">New purchase alert</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive an email each time a fan purchases a square, including their name
                  and message so you can action the moderation queue promptly.
                </p>
              </div>
            </div>
            <button
              onClick={() => update('newPurchaseAlert', !form.newPurchaseAlert)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                form.newPurchaseAlert ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.newPurchaseAlert ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Daily digest */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Daily digest</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive a single daily summary of all purchases instead of individual alerts.
                  Useful during busy campaign periods.
                </p>
              </div>
            </div>
            <button
              onClick={() => update('dailyDigest', !form.dailyDigest)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                form.dailyDigest ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.dailyDigest ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {form.dailyDigest && (
            <div className="ml-7">
              <label className="block text-xs text-muted-foreground mb-1.5">Send digest at</label>
              <input
                type="time"
                value={form.digestTime}
                onChange={e => update('digestTime', e.target.value)}
                className="text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>

      </div>

      <div className="flex items-center justify-between">
        {saved
          ? <span className="flex items-center gap-1.5 text-sm text-green-600"><Check size={14} /> Saved</span>
          : <span />
        }
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving
            ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full" /> Saving…</>
            : <><Check size={14} /> Save settings</>
          }
        </button>
      </div>
    </div>
  )
}
