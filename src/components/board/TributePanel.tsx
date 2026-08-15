'use client'

import { X } from 'lucide-react'
import type { Square } from '@/types'
import { gridRef, formatDate } from '@/lib/utils'

interface TributePanelProps {
  square:  Square
  onClose: () => void
}

export default function TributePanel({ square, onClose }: TributePanelProps) {
  const ref = gridRef(square.gridX, square.gridY)

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-foreground">{square.fanName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Square {ref}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
          <X size={16} />
        </button>
      </div>

      {square.fanMessage ? (
        <blockquote className="border-l-2 border-[var(--club-primary)] pl-3 py-1 my-3">
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            "{square.fanMessage}"
          </p>
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground my-3 italic">A proud supporter.</p>
      )}

      {square.publishedAt && (
        <p className="text-xs text-muted-foreground">
          Claimed {formatDate(square.publishedAt)}
        </p>
      )}

      <button
        onClick={onClose}
        className="mt-4 w-full text-sm text-muted-foreground border border-input rounded-md py-2 hover:bg-accent transition-colors"
      >
        Close
      </button>
    </div>
  )
}
