'use client'

import { useState } from 'react'
import { Check, X, Clock, MessageSquare, User } from 'lucide-react'
import { gridRef, formatRelativeTime } from '@/lib/utils'

interface PendingSquare {
  id: string; grid_x: number; grid_y: number
  fan_name: string; fan_message: string | null; fan_email: string
  purchased_at: string; rejection_count: number
}

export default function ModerationClient({ initialPending }: { initialPending: PendingSquare[] }) {
  const [items,    setItems]    = useState<PendingSquare[]>(initialPending)
  const [loading,  setLoading]  = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function moderate(squareId: string, action: 'approve' | 'reject', rejectionNote?: string) {
    setLoading(squareId)
    try {
      const res = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareId, action, rejectionNote }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setItems(prev => prev.filter(i => i.id !== squareId))
      showToast(action === 'approve' ? 'Square approved and fan notified' : 'Square rejected and fan notified', 'success')
      setRejectId(null)
      setRejectNote('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-foreground">Moderation queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve fan messages before they go live on the board
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          <Clock size={14} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-700">{items.length} pending</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
          <Check size={32} className="mx-auto mb-3 text-green-500 opacity-50" />
          <p className="font-medium text-foreground">Queue is clear</p>
          <p className="text-sm mt-1">All fan messages have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="border border-border rounded-xl bg-background overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.fan_name}</p>
                      <p className="text-xs text-muted-foreground">{item.fan_email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Square {gridRef(item.grid_x, item.grid_y)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(item.purchased_at)}
                    </p>
                    {item.rejection_count > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Resubmission #{item.rejection_count}
                      </p>
                    )}
                  </div>
                </div>

                {item.fan_message ? (
                  <blockquote className="border-l-2 border-primary pl-3 py-1 my-2">
                    <p className="text-sm text-foreground/80 italic leading-relaxed">
                      "{item.fan_message}"
                    </p>
                  </blockquote>
                ) : (
                  <p className="text-sm text-muted-foreground italic my-2 flex items-center gap-1.5">
                    <MessageSquare size={13} /> No message — name only
                  </p>
                )}

                {/* Rejection note input */}
                {rejectId === item.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      Reason for rejection <span className="text-muted-foreground/60">(sent to fan)</span>
                    </label>
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="e.g. Message contains inappropriate language. Please resubmit a revised message."
                      rows={2}
                      className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex border-t border-border">
                <button
                  onClick={() => moderate(item.id, 'approve')}
                  disabled={loading === item.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <Check size={15} />
                  Approve
                </button>

                {rejectId === item.id ? (
                  <>
                    <div className="w-px bg-border" />
                    <button
                      onClick={() => moderate(item.id, 'reject', rejectNote)}
                      disabled={loading === item.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <X size={15} />
                      Send rejection
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      onClick={() => { setRejectId(null); setRejectNote('') }}
                      className="px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-px bg-border" />
                    <button
                      onClick={() => setRejectId(item.id)}
                      disabled={loading === item.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <X size={15} />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
