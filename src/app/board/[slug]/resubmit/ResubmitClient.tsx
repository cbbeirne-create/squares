'use client'

import { useState } from 'react'
import Link from 'next/link'
import { validateFanName, validateMessage } from '@/lib/utils'

interface Props {
  clubName: string
  slug: string
  squareId: string
  token: string
}

export default function ResubmitClient({ clubName, slug, squareId, token }: Props) {
  const [fanName, setFanName] = useState('')
  const [fanMessage, setFanMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const validationError = validateFanName(fanName) ?? (fanMessage ? validateMessage(fanMessage) : null)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/purchase/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareId, token, fanName, fanMessage }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Update failed')
      setComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (complete) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-background p-6 text-center">
        <h1 className="text-xl font-medium">Tribute resubmitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">The {clubName} team will review your updated tribute.</p>
        <Link href={`/board/${slug}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--club-primary)] px-4 text-sm font-medium text-white">
          Return to the board
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-xl border border-border bg-background p-6">
      <h1 className="text-xl font-medium">Update your tribute</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter the revised name and message you would like {clubName} to review.</p>
      {error && <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <label className="mt-5 block text-sm font-medium">
        Name
        <input required maxLength={60} autoComplete="name" value={fanName} onChange={event => setFanName(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Message <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea rows={4} maxLength={160} value={fanMessage} onChange={event => setFanMessage(event.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <span className="mt-1 block text-right text-xs text-muted-foreground">{160 - fanMessage.length} remaining</span>
      </label>
      <button disabled={submitting} type="submit" className="mt-5 min-h-11 w-full rounded-md bg-[var(--club-primary)] px-4 text-sm font-medium text-white disabled:opacity-60">
        {submitting ? 'Sending…' : 'Resubmit securely'}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">This private link expires after one successful use.</p>
    </form>
  )
}
