'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Square, Client } from '@/types'
import { gridRef } from '@/lib/utils'

interface SquareGrid {
  client:          Client
  squares:         Square[]
  onSelectAvailable: (x: number, y: number) => void
  onSelectPurchased: (square: Square) => void
  selectedX?:      number | null
  selectedY?:      number | null
}

const COLORS = {
  available:  'rgba(255,255,255,0.07)',
  availHover: 'rgba(255,215,0,0.55)',
  pending:    '#71716B',
  reserved:   '#854F0B',
  published1: '#B22222',
  published2: '#185FA5',
  published3: '#533AB7',
  published4: '#0F6E56',
  selected:   '#FFD700',
  border:     'rgba(255,255,255,0.07)',
}

// Deterministic colour from square index
function squareColor(x: number, y: number): string {
  const n = (x * 31 + y * 17) % 4
  return [COLORS.published1, COLORS.published2, COLORS.published3, COLORS.published4][n]
}

export default function SquareGridCanvas({
  client, squares, onSelectAvailable, onSelectPurchased, selectedX, selectedY,
}: SquareGrid) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef({
    scale: 1, offsetX: 0, offsetY: 0,
    isDragging: false, dragStartX: 0, dragStartY: 0, lastOffsetX: 0, lastOffsetY: 0,
    hoverX: -1, hoverY: -1, pinchDist: 0,
  })
  const squaresMap = useRef<Map<string, Square>>(new Map())
  const animFrame  = useRef<number>(0)

  // Build lookup map
  useEffect(() => {
    squaresMap.current = new Map(squares.map(s => [`${s.gridX},${s.gridY}`, s]))
  }, [squares])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { scale, offsetX, offsetY, hoverX, hoverY } = stateRef.current
    const { gridCols: cols, gridRows: rows } = client

    const cellW = (canvas.width / cols) * scale
    const cellH = (canvas.height / rows) * scale

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = offsetX + x * cellW
        const py = offsetY + y * cellH

        // Culling — skip off-screen cells
        if (px + cellW < 0 || px > canvas.width) continue
        if (py + cellH < 0 || py > canvas.height) continue

        const sq = squaresMap.current.get(`${x},${y}`)
        const isSelected = selectedX === x && selectedY === y
        const isHovered  = hoverX === x && hoverY === y && !sq?.status?.match(/pending|reserved/)

        let fill: string
        if (isSelected) {
          fill = COLORS.selected
        } else if (sq?.isReserved) {
          fill = COLORS.reserved
        } else if (sq?.status === 'pending') {
          fill = COLORS.pending
        } else if (sq?.status === 'published') {
          fill = squareColor(x, y)
        } else if (isHovered) {
          fill = COLORS.availHover
        } else {
          fill = COLORS.available
        }

        ctx.fillStyle = fill
        ctx.fillRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1)

        // Border
        ctx.strokeStyle = COLORS.border
        ctx.lineWidth   = 0.5
        ctx.strokeRect(px + 0.5, py + 0.5, cellW - 1, cellH - 1)

        // Selected highlight ring
        if (isSelected) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth   = 1.5
          ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2)
        }
      }
    }
  }, [client, selectedX, selectedY])

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(animFrame.current)
    animFrame.current = requestAnimationFrame(draw)
  }, [draw])

  // Redraw on changes
  useEffect(() => { scheduleDraw() }, [squares, selectedX, selectedY, scheduleDraw])

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width  * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      scheduleDraw()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [scheduleDraw])

  // Hit testing
  const hitTest = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect   = canvas.getBoundingClientRect()
    const { scale, offsetX, offsetY } = stateRef.current
    const { gridCols: cols, gridRows: rows } = client
    const dpr    = devicePixelRatio

    const canvasX = (clientX - rect.left) * dpr
    const canvasY = (clientY - rect.top) * dpr
    const cellW   = (canvas.width / cols) * scale
    const cellH   = (canvas.height / rows) * scale

    const gx = Math.floor((canvasX - offsetX) / cellW)
    const gy = Math.floor((canvasY - offsetY) / cellH)

    if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return null
    return { x: gx, y: gy }
  }, [client])

  // Mouse events
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    if (s.isDragging) {
      s.offsetX = s.lastOffsetX + (e.clientX - s.dragStartX)
      s.offsetY = s.lastOffsetY + (e.clientY - s.dragStartY)
      scheduleDraw()
      return
    }
    const hit = hitTest(e.clientX, e.clientY)
    if (hit) {
      s.hoverX = hit.x; s.hoverY = hit.y
    } else {
      s.hoverX = -1; s.hoverY = -1
    }
    scheduleDraw()
  }, [hitTest, scheduleDraw])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    s.isDragging  = false
    s.dragStartX  = e.clientX
    s.dragStartY  = e.clientY
    s.lastOffsetX = s.offsetX
    s.lastOffsetY = s.offsetY
    const onMove = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - s.dragStartX) > 4 || Math.abs(ev.clientY - s.dragStartY) > 4) {
        s.isDragging = true
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const onClick = useCallback((e: React.MouseEvent) => {
    if (stateRef.current.isDragging) { stateRef.current.isDragging = false; return }
    const hit = hitTest(e.clientX, e.clientY)
    if (!hit) return
    const sq = squaresMap.current.get(`${hit.x},${hit.y}`)
    if (sq?.isReserved || sq?.status === 'pending') return
    if (sq?.status === 'published') { onSelectPurchased(sq); return }
    onSelectAvailable(hit.x, hit.y)
  }, [hitTest, onSelectAvailable, onSelectPurchased])

  // Scroll zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const s     = stateRef.current
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(8, Math.max(0.5, s.scale * delta))
    // Zoom toward cursor
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const mx     = (e.clientX - rect.left) * devicePixelRatio
    const my     = (e.clientY - rect.top)  * devicePixelRatio
    s.offsetX = mx - (mx - s.offsetX) * (newScale / s.scale)
    s.offsetY = my - (my - s.offsetY) * (newScale / s.scale)
    s.scale   = newScale
    scheduleDraw()
  }, [scheduleDraw])

  // Touch events (pinch-to-zoom)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const s = stateRef.current
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      s.pinchDist = Math.hypot(dx, dy)
    } else if (e.touches.length === 1) {
      s.dragStartX  = e.touches[0].clientX
      s.dragStartY  = e.touches[0].clientY
      s.lastOffsetX = s.offsetX
      s.lastOffsetY = s.offsetY
      s.isDragging  = false
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const s = stateRef.current
    if (e.touches.length === 2) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (s.pinchDist > 0) {
        const ratio    = dist / s.pinchDist
        const newScale = Math.min(8, Math.max(0.5, s.scale * ratio))
        s.scale    = newScale
        s.pinchDist = dist
        scheduleDraw()
      }
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - s.dragStartX
      const dy = e.touches[0].clientY - s.dragStartY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.isDragging = true
      s.offsetX = s.lastOffsetX + dx
      s.offsetY = s.lastOffsetY + dy
      scheduleDraw()
    }
  }, [scheduleDraw])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const s = stateRef.current
    if (!s.isDragging && e.changedTouches.length === 1) {
      const t   = e.changedTouches[0]
      const hit = hitTest(t.clientX, t.clientY)
      if (hit) {
        const sq = squaresMap.current.get(`${hit.x},${hit.y}`)
        if (sq?.isReserved || sq?.status === 'pending') return
        if (sq?.status === 'published') { onSelectPurchased(sq); return }
        onSelectAvailable(hit.x, hit.y)
      }
    }
    s.isDragging = false
    s.pinchDist  = 0
  }, [hitTest, onSelectAvailable, onSelectPurchased])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  )
}
