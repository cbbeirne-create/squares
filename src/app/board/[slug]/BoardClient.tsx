'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Client, Square, CampaignAnalytics } from '@/types'
import { percentSold, formatCurrency } from '@/lib/utils'
import Stadium from '@/components/board/Stadium'
import PurchasePanel from '@/components/board/PurchasePanel'
import TributePanel from '@/components/board/TributePanel'

interface Props {
  client:         Client
  initialSquares: Square[]
}

export default function BoardClient({ client, initialSquares }: Props) {
  const [squares,   setSquares]   = useState<Square[]>(initialSquares)
  const [selectedX, setSelectedX] = useState<number | null>(null)
  const [selectedY, setSelectedY] = useState<number | null>(null)
  const [panel,     setPanel]     = useState<'purchase' | 'tribute' | null>(null)
  const [activeSq,  setActiveSq]  = useState<Square | null>(null)

  const total    = client.gridCols * client.gridRows
  const published = squares.filter(s => s.status === 'published').length
  const pending   = squares.filter(s => s.status === 'pending').length
  const reserved  = squares.filter(s => s.isReserved).length
  const remaining = total - published - pending - reserved
  const pct       = percentSold(published, total)

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`squares:${client.id}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'squares',
        filter: `client_id=eq.${client.id}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setSquares(prev => [...prev, mapSquare(payload.new)])
        } else if (payload.eventType === 'UPDATE') {
          setSquares(prev => prev.map(s => s.id === payload.new.id ? mapSquare(payload.new) : s))
        } else if (payload.eventType === 'DELETE') {
          setSquares(prev => prev.filter(s => s.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [client.id])

  const handleSelectAvailable = useCallback((x: number, y: number) => {
    setSelectedX(x); setSelectedY(y)
    setPanel('purchase'); setActiveSq(null)
  }, [])

  const handleSelectPurchased = useCallback((sq: Square) => {
    setSelectedX(sq.gridX); setSelectedY(sq.gridY)
    setActiveSq(sq); setPanel('tribute')
  }, [])

  const handleClose = useCallback(() => {
    setPanel(null); setActiveSq(null)
    setSelectedX(null); setSelectedY(null)
  }, [])

  const handlePurchaseSuccess = useCallback((fanName: string) => {
    // Optimistically add pending square
    if (selectedX !== null && selectedY !== null) {
      setSquares(prev => [...prev, {
        id: `optimistic-${Date.now()}`,
        clientId: client.id,
        gridX: selectedX, gridY: selectedY,
        status: 'pending',
        fanName, fanMessage: null, fanEmail: null,
        purchasedAt: new Date().toISOString(),
        publishedAt: null, rejectedAt: null,
        stripePaymentIntentId: null,
        isReserved: false, reservedLabel: null,
      }])
    }
    setPanel('purchase') // keep panel open showing success step
  }, [client.id, selectedX, selectedY])

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 space-y-4">

      {/* Site header */}
      <header
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--club-primary)' }}
      >
        <h1 className="text-white font-medium text-base">{client.clubName} — Claim your square</h1>
        <nav className="flex gap-2">
          <a href="#how-it-works" className="text-xs text-white/75 border border-white/20 rounded px-2.5 py-1 hover:bg-white/10 transition-colors">
            How it works
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section
        className="rounded-xl px-4 py-5"
        style={{ background: 'var(--club-secondary)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-medium text-lg leading-snug mb-1">
              {client.promo.headline}
            </h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              {client.promo.body}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {[
              { n: published + pending, l: 'Claimed' },
              { n: remaining,           l: 'Remaining' },
              { n: formatCurrency(client.pricePerSquare, client.currencySymbol, client.currency), l: 'Per square' },
            ].map(({ n, l }) => (
              <div key={l} className="bg-black/25 rounded-lg px-3 py-2 text-center min-w-[64px]">
                <div className="text-lg font-medium leading-none" style={{ color: 'var(--club-accent)' }}>{n}</div>
                <div className="text-[10px] text-white/60 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-white/60 mb-1.5">
            <span>{published + pending} of {total} squares claimed</span>
            <span>{pct}% complete</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'var(--club-accent)' }}
            />
          </div>
        </div>
      </section>

      {/* Stadium + panel */}
      <div className="flex gap-4 items-start flex-wrap lg:flex-nowrap">
        <div className="flex-1 min-w-0">
          <Stadium
            client={client}
            squares={squares}
            onSelectAvailable={handleSelectAvailable}
            onSelectPurchased={handleSelectPurchased}
            selectedX={selectedX}
            selectedY={selectedY}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 px-1">
            {[
              { color: 'rgba(128,128,128,0.2)', border: '0.5px solid rgba(128,128,128,0.4)', label: 'Available' },
              { color: 'var(--club-primary)', label: 'Claimed' },
              { color: '#71716B', label: 'Pending approval' },
              { color: '#854F0B', label: 'Reserved' },
              { color: 'var(--club-accent)', border: '0.5px solid #cca800', label: 'Your selection' },
            ].map(({ color, border, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0" style={{ background: color, border: border ?? 'none' }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        {panel && (
          <div className="w-full lg:w-80 flex-shrink-0 border border-border rounded-xl p-4 bg-background animate-fade-in">
            {panel === 'purchase' && selectedX !== null && selectedY !== null && (
              <PurchasePanel
                client={client}
                gridX={selectedX}
                gridY={selectedY}
                onClose={handleClose}
                onSuccess={handlePurchaseSuccess}
              />
            )}
            {panel === 'tribute' && activeSq && (
              <TributePanel square={activeSq} onClose={handleClose} />
            )}
          </div>
        )}

        {/* Empty state hint */}
        {!panel && (
          <div className="hidden lg:flex w-80 flex-shrink-0 border border-dashed border-border rounded-xl p-6 items-center justify-center text-center text-muted-foreground text-sm">
            <div>
              <div className="text-2xl mb-2">👆</div>
              Tap any available square on the pitch to claim it
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <section id="how-it-works" className="border border-border rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4 text-sm">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: '1', t: 'Choose your square', d: 'Tap any available square on the pitch. You can read the tributes other fans have already left.' },
            { n: '2', t: 'Leave your tribute', d: 'Enter your name and an optional message — a memory, a dedication, or simply your pride in the club.' },
            { n: '3', t: 'Your place in history', d: `Pay securely with card, Apple Pay or Google Pay. Once approved by ${client.clubName}, your square is permanently live.` },
          ].map(({ n, t, d }) => (
            <div key={n} className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5"
                style={{ background: 'var(--club-primary)', color: '#fff' }}
              >
                {n}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{t}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground pb-4">
        {client.clubName} — Stadium Squares campaign · Payments processed securely by Stripe
      </footer>
    </div>
  )
}

function mapSquare(raw: Record<string, unknown>): Square {
  return {
    id:                    raw.id as string,
    clientId:              raw.client_id as string,
    gridX:                 raw.grid_x as number,
    gridY:                 raw.grid_y as number,
    status:                raw.status as Square['status'],
    fanName:               raw.fan_name as string | null,
    fanMessage:            raw.fan_message as string | null,
    fanEmail:              raw.fan_email as string | null,
    purchasedAt:           raw.purchased_at as string | null,
    publishedAt:           raw.published_at as string | null,
    rejectedAt:            raw.rejected_at as string | null,
    stripePaymentIntentId: raw.stripe_payment_intent_id as string | null,
    isReserved:            raw.is_reserved as boolean,
    reservedLabel:         raw.reserved_label as string | null,
  }
}
