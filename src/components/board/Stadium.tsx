'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Client, Square } from '@/types'
import { drawPitch } from '@/lib/utils/pitch-renderer'
import SquareGridCanvas from './SquareGridCanvas'

interface StadiumProps {
  client:            Client
  squares:           Square[]
  onSelectAvailable: (x: number, y: number) => void
  onSelectPurchased: (square: Square) => void
  selectedX?:        number | null
  selectedY?:        number | null
}

function StandBg({ url, label, className }: { url: string | null; label: string; className: string }) {
  if (url) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={url} alt={label} fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/30" />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium tracking-widest uppercase text-white/90 pointer-events-none">
          {label}
        </span>
      </div>
    )
  }
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: 'var(--club-secondary)' }}
    >
      <span className="text-[9px] font-medium tracking-widest uppercase pointer-events-none"
        style={{ color: 'var(--club-accent)' }}>
        {label}
      </span>
    </div>
  )
}

function SeatTexture({ horizontal }: { horizontal: boolean }) {
  const count = horizontal ? 60 : 8
  return (
    <div className={`flex ${horizontal ? 'flex-col gap-[2px] w-full' : 'flex-row gap-[2px] h-full'}`}>
      {Array.from({ length: horizontal ? 2 : 6 }).map((_, r) => (
        <div key={r} className={`flex gap-[2px] ${horizontal ? 'flex-row' : 'flex-col'}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="rounded-[1px] flex-shrink-0"
              style={{
                width:   horizontal ? '5px' : '4px',
                height:  horizontal ? '5px' : '4px',
                background: Math.random() > 0.4
                  ? 'var(--club-primary)'
                  : 'var(--club-secondary)',
                opacity: 0.7 + Math.random() * 0.3,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function HoardingStrip({
  client, position,
}: { client: Client; position: 'top' | 'bottom' | 'left' | 'right' }) {
  const isH = position === 'top' || position === 'bottom'
  const hoardings = client.hoardings.filter(h => h.position === position && h.isPublished)
  const empty = 4 - hoardings.length

  return (
    <div
      className={`bg-[#111] flex ${isH ? 'flex-row' : 'flex-col'} gap-[2px] p-[2px]`}
      style={{ [isH ? 'height' : 'width']: '16px' }}
    >
      {hoardings.map(h => (
        <div
          key={h.id}
          className="flex-1 flex items-center justify-center overflow-hidden rounded-[1px]"
          style={{ background: h.bgColor }}
        >
          {h.logoUrl
            ? <Image src={h.logoUrl} alt="Sponsor" width={40} height={12} className="object-contain max-h-full" />
            : <span className="text-[6px] font-medium text-white/60 tracking-wide truncate px-1">SPONSOR</span>
          }
        </div>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <div key={i} className="flex-1 rounded-[1px]" style={{ background: 'var(--club-primary)', opacity: 0.2 }} />
      ))}
    </div>
  )
}

export default function Stadium({ client, squares, onSelectAvailable, onSelectPurchased, selectedX, selectedY }: StadiumProps) {
  const pitchRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = pitchRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    drawPitch(canvas, {
      width:  rect.width  * devicePixelRatio,
      height: rect.height * devicePixelRatio,
      sport:  client.sport,
    })
  }, [client.sport])

  return (
    <div
      className="rounded-xl overflow-hidden border-2"
      style={{ background: 'var(--club-secondary)', borderColor: 'var(--club-secondary)' }}
    >
      {/* Top stand */}
      <StandBg
        url={client.standGraphics.top}
        label={client.clubName}
        className="h-10 w-full"
      />

      {/* Middle row: left stand, field, right stand */}
      <div className="flex">
        {/* Left stand */}
        <StandBg
          url={client.standGraphics.left}
          label={client.clubName}
          className="w-10 min-h-[200px]"
        />

        {/* Field column */}
        <div className="flex-1 flex flex-col">
          <HoardingStrip client={client} position="top" />

          <div className="flex flex-1">
            <HoardingStrip client={client} position="left" />

            {/* Pitch + grid */}
            <div className="flex-1 relative" style={{ background: '#2d7a3a', minHeight: '200px' }}>
              {/* Pitch line overlay */}
              <canvas
                ref={pitchRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {/* Square grid (canvas) */}
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

        {/* Right stand */}
        <StandBg
          url={client.standGraphics.right}
          label={client.clubName}
          className="w-10 min-h-[200px]"
        />
      </div>

      {/* Bottom stand */}
      <StandBg
        url={client.standGraphics.bottom}
        label={client.clubName}
        className="h-10 w-full"
      />
    </div>
  )
}
