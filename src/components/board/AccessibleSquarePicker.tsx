'use client'

import { useMemo, useState } from 'react'
import type { Client, Square } from '@/types'
import { gridRef } from '@/lib/utils'

interface Props {
  client: Client
  squares: Square[]
  onSelectAvailable: (x: number, y: number) => void
  onSelectPurchased: (square: Square) => void
}

export default function AccessibleSquarePicker({
  client,
  squares,
  onSelectAvailable,
  onSelectPurchased,
}: Props) {
  const [row, setRow] = useState(0)
  const [column, setColumn] = useState(0)
  const occupied = useMemo(
    () => new Map(squares.map(square => [`${square.gridX},${square.gridY}`, square])),
    [squares],
  )
  const square = occupied.get(`${column},${row}`)
  const unavailable = Boolean(square?.isReserved || square?.status === 'pending')

  function choose() {
    if (unavailable) return
    if (square?.status === 'published') {
      onSelectPurchased(square)
    } else {
      onSelectAvailable(column, row)
    }
  }

  return (
    <details className="mt-3 border border-border rounded-lg bg-background">
      <summary className="min-h-11 flex cursor-pointer items-center px-3 text-sm font-medium text-foreground">
        Accessible square selector
      </summary>
      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground mb-3">
          Select a row and column using standard form controls.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">
            Row
            <select value={row} onChange={event => setRow(Number(event.target.value))}
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
              {Array.from({ length: client.gridRows }, (_, index) => (
                <option key={index} value={index}>{index + 1}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Column
            <select value={column} onChange={event => setColumn(Number(event.target.value))}
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
              {Array.from({ length: client.gridCols }, (_, index) => (
                <option key={index} value={index}>{index + 1}</option>
              ))}
            </select>
          </label>
        </div>
        <div aria-live="polite" className="mt-3 text-sm">
          <strong>{gridRef(column, row)}</strong> — {
            square?.status === 'published'
              ? 'published tribute'
              : unavailable
                ? 'currently unavailable'
                : 'available'
          }
        </div>
        <button type="button" onClick={choose} disabled={unavailable}
          className="mt-3 min-h-11 w-full rounded-md bg-[var(--club-primary)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
          {square?.status === 'published' ? 'Read this tribute' : 'Choose this square'}
        </button>
      </div>
    </details>
  )
}
