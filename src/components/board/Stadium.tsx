'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Client, Square } from '@/types'
import { drawPitch } from '@/lib/utils/pitch-renderer'
import SquareGridCanvas from './SquareGridCanvas'
import AccessibleSquarePicker from './AccessibleSquarePicker'

interface StadiumProps {
  client: Client
  squares: Square[]
  onSelectAvailable: (x: number, y: number) => void
  onSelectPurchased: (square: Square) => void
  selectedX?: number | null
  selectedY?: number | null
}

function StandBg({ url, label, className }: { url: string | null; label: string; className: string }) {
  if (url) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={url} alt="" fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/30" />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium tracking-widest uppercase text-white/90 pointer-events-none">
          {label}
        </span>
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: 'var(--club-secondary)' }}>
      <span className="text-[9px] font-medium tracking-widest uppercase pointer-events-none" style={{ color: 'var(--club-accent)' }}>
        {label}
      </span>
    </div>
  )
}

function safeSponsorUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

function HoardingStrip({ client, position }: { client: Client; position: 'top' | 'bottom' | 'left' | 'right' }) {
  const horizontal = position === 'top' || position === 'bottom'
  const hoarding = client.hoardings.find(item => item.position === position && item.isPublished)

  const content = hoarding?.logoUrl
    ? <Image src={hoarding.logoUrl} alt="Sponsor" width={80} height={20} className="object-contain max-h-full max-w-full" />
    : <span className="text-[6px] font-medium text-white/60 tracking-wide truncate px-1">{hoarding ? 'SPONSOR' : ''}</span>

  const link = safeSponsorUrl(hoarding?.linkUrl ?? null)

  return (
    <div className="bg-[#111] p-[2px]" style={{ [horizontal ? 'height' : 'width']: '18px' }}>
      <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-[1px]"
        style={{ background: hoarding?.bgColor ?? 'var(--club-primary)', opacity: hoarding ? 1 : 0.25 }}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer sponsored"
            aria-label="Visit sponsor website" className="w-full h-full flex items-center justify-center">
            {content}
          </a>
        ) : content}
      </div>
    </div>
  )
}

export default function Stadium({
  client,
  squares,
  onSelectAvailable,
  onSelectPurchased,
  selectedX,
  selectedY,
}: StadiumProps) {
  const pitchRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = pitchRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      drawPitch(canvas, {
        width: rect.width * devicePixelRatio,
        height: rect.height * devicePixelRatio,
        sport: client.sport,
      })
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [client.sport])

  return (
    <>
      <div className="rounded-xl overflow-hidden border-2" style={{ background: 'var(--club-secondary)', borderColor: 'var(--club-secondary)' }}>
        <StandBg url={client.standGraphics.top} label={client.clubName} className="h-10 w-full" />
        <div className="flex">
          <StandBg url={client.standGraphics.left} label={client.clubName} className="w-7 sm:w-10 min-h-[220px]" />
          <div className="flex-1 flex flex-col min-w-0">
            <HoardingStrip client={client} position="top" />
            <div className="flex flex-1 min-w-0">
              <HoardingStrip client={client} position="left" />
              <div className="flex-1 relative min-w-0" style={{ background: '#2d7a3a', minHeight: '220px' }}>
                <canvas ref={pitchRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
                <SquareGridCanvas
                  client={client}
                  squares={squares}
                  onSelectAvailable={onSelectAvailable}
                  onSelectPurchased={onSelectPurchased}
                  selectedX={selectedX}
                  selectedY={selectedY}
                />
              </div>
              <HoardingStrip client={client} position="right" />
            </div>
            <HoardingStrip client={client} position="bottom" />
          </div>
          <StandBg url={client.standGraphics.right} label={client.clubName} className="w-7 sm:w-10 min-h-[220px]" />
        </div>
        <StandBg url={client.standGraphics.bottom} label={client.clubName} className="h-10 w-full" />
      </div>

      <AccessibleSquarePicker
        client={client}
        squares={squares}
        onSelectAvailable={onSelectAvailable}
        onSelectPurchased={onSelectPurchased}
      />
    </>
  )
}
