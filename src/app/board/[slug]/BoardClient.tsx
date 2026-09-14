'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Client, Square } from '@/types'
import { percentSold, formatCurrency } from '@/lib/utils'
import Stadium from '@/components/board/Stadium'
import PurchasePanel from '@/components/board/PurchasePanel'
import TributePanel from '@/components/board/TributePanel'

interface Props {
  client: Client
  initialSquares: Square[]
}

export default function BoardClient({ client, initialSquares }: Props) {
  const [squares, setSquares] = useState<Square[]>(initialSquares)
  const [selectedX, setSelectedX] = useState<number | null>(null)
  const [selectedY, setSelectedY] = useState<number | null>(null)
  const [panel, setPanel] = useState<'purchase' | 'tribute' | null>(null)
  const [activeSq, setActiveSq] = useState<Square | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const total = client.gridCols * client.gridRows
  const published = squares.filter(square => square.status === 'published').length
  const pending = squares.filter(square => square.status === 'pending').length
  const reserved = squares.filter(square => square.isReserved).length
  const remaining = Math.max(0, total - published - pending - reserved)
  const claimed = published + pending + reserved
  const pct = percentSold(claimed, total)

  const refreshSquares = useCallback(async () => {
    try {
      const response = await fetch(`/api/board/${encodeURIComponent(client.slug)}`, {
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = await response.json()
      if (Array.isArray(data.squares)) setSquares(data.squares)
    } catch {
      // Keep the last known board when a background refresh fails.
    }
  }, [client.slug])

  useEffect(() => {
    const timer = window.setInterval(refreshSquares, 15_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSquares()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshSquares])

  useEffect(() => {
    if (!panel || !panelRef.current || window.innerWidth >= 1024) return
    panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    panelRef.current.focus({ preventScroll: true })
  }, [panel])

  const handleSelectAvailable = useCallback((x: number, y: number) => {
    setSelectedX(x)
    setSelectedY(y)
    setPanel('purchase')
    setActiveSq(null)
  }, [])

  const handleSelectPurchased = useCallback((square: Square) => {
    setSelectedX(square.gridX)
    setSelectedY(square.gridY)
    setActiveSq(square)
    setPanel('tribute')
  }, [])

  const handleClose = useCallback(() => {
    setPanel(null)
    setActiveSq(null)
    setSelectedX(null)
    setSelectedY(null)
  }, [])

  const handlePurchaseSuccess = useCallback((fanName: string) => {
    if (selectedX !== null && selectedY !== null) {
      setSquares(previous => {
        const withoutCoordinate = previous.filter(
          square => square.gridX !== selectedX || square.gridY !== selectedY,
        )
        return [...withoutCoordinate, {
          id: `optimistic-${Date.now()}`,
          clientId: client.id,
          gridX: selectedX,
          gridY: selectedY,
          status: 'pending',
          fanName,
          fanMessage: null,
          fanEmail: null,
          purchasedAt: new Date().toISOString(),
          publishedAt: null,
          rejectedAt: null,
          stripePaymentIntentId: null,
          isReserved: false,
          reservedLabel: null,
        }]
      })
    }
    window.setTimeout(refreshSquares, 1500)
  }, [client.id, refreshSquares, selectedX, selectedY])

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 space-y-4">
      <header className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: 'var(--club-primary)' }}>
        <h1 className="text-white font-medium text-sm sm:text-base">{client.clubName} — Claim your square</h1>
        <a href="#how-it-works" className="min-h-11 inline-flex items-center text-xs text-white/90 border border-white/30 rounded px-3 hover:bg-white/10">
          How it works
        </a>
      </header>

      <section className="rounded-xl px-4 py-5" style={{ background: 'var(--club-secondary)' }}>
        <h2 className="text-white font-medium text-lg leading-snug mb-1">{client.promo.headline}</h2>
        <p className="text-white/80 text-sm leading-relaxed max-w-2xl">{client.promo.body}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { n: claimed, l: 'Claimed' },
            { n: remaining, l: 'Remaining' },
            { n: formatCurrency(client.pricePerSquare, client.currencySymbol, client.currency), l: 'Per square' },
          ].map(({ n, l }) => (
            <div key={l} className="bg-black/25 rounded-lg px-2 py-2 text-center min-w-0">
              <div className="text-base sm:text-lg font-medium leading-none truncate" style={{ color: 'var(--club-accent)' }}>{n}</div>
              <div className="text-[10px] text-white/70 mt-1">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-white/70 mb-1.5">
            <span>{claimed} of {total} unavailable</span><span>{pct}% claimed</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--club-accent)' }} />
          </div>
        </div>
      </section>

      <div className="flex gap-4 items-start flex-wrap lg:flex-nowrap">
        <div className="flex-1 min-w-0">
          <Stadium client={client} squares={squares} onSelectAvailable={handleSelectAvailable} onSelectPurchased={handleSelectPurchased} selectedX={selectedX} selectedY={selectedY} />
          <div className="flex flex-wrap gap-3 mt-3 px-1" aria-label="Board legend">
            {[
              { color: 'rgba(128,128,128,0.2)', label: 'Available' },
              { color: 'var(--club-primary)', label: 'Published' },
              { color: '#71716B', label: 'Checkout or approval pending' },
              { color: '#854F0B', label: 'Reserved' },
              { color: 'var(--club-accent)', label: 'Your selection' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {panel && (
          <div ref={panelRef} tabIndex={-1} className="w-full lg:w-80 flex-shrink-0 border border-border rounded-xl p-4 bg-background animate-fade-in scroll-mt-3 focus:outline-none">
            {panel === 'purchase' && selectedX !== null && selectedY !== null && (
              <PurchasePanel client={client} gridX={selectedX} gridY={selectedY} onClose={handleClose} onSuccess={handlePurchaseSuccess} />
            )}
            {panel === 'tribute' && activeSq && <TributePanel square={activeSq} onClose={handleClose} />}
          </div>
        )}
      </div>

      <section id="how-it-works" className="border border-border rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4 text-sm">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['1', 'Choose your square', 'Use the pitch or the accessible square selector to choose an available place.'],
            ['2', 'Leave your tribute', 'Enter your name and an optional message, then pay securely through Stripe.'],
            ['3', 'Your place in history', `After ${client.clubName} approves the tribute, your square becomes permanently visible.`],
          ].map(([n, title, description]) => (
            <div key={n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: 'var(--club-primary)', color: '#fff' }}>{n}</div>
              <div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground pb-4">
        {client.clubName} · Payments processed securely by Stripe
      </footer>
    </div>
  )
}
