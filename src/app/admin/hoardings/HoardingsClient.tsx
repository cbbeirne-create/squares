'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Eye, EyeOff, Link, Palette, Check } from 'lucide-react'

export type Position = 'top' | 'bottom' | 'left' | 'right'

export interface Hoarding {
  id:           string
  position:     Position
  logo_url:     string | null
  link_url:     string | null
  bg_color:     string
  is_published: boolean
}

const POSITION_LABELS: Record<Position, string> = {
  top:    'Top hoarding (behind one try line)',
  bottom: 'Bottom hoarding (behind other try line)',
  left:   'Left hoarding (near touchline)',
  right:  'Right hoarding (far touchline)',
}

function HoardingSlot({ hoarding, onUpdate }: {
  hoarding: Hoarding
  onUpdate: (id: string, updates: Partial<Hoarding>) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [linkUrl,   setLinkUrl]   = useState(hoarding.link_url ?? '')
  const [bgColor,   setBgColor]   = useState(hoarding.bg_color)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('hoardingId', hoarding.id)
      const res  = await fetch('/api/admin/hoardings/upload-logo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.url) onUpdate(hoarding.id, { logo_url: data.url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [hoarding.id, onUpdate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    maxFiles: 1,
  })

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/hoardings/update', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hoardingId: hoarding.id, linkUrl, bgColor }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onUpdate(hoarding.id, { link_url: linkUrl || null, bg_color: bgColor })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish() {
    const next = !hoarding.is_published
    setError(null)
    try {
      const res = await fetch('/api/admin/hoardings/publish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hoardingId: hoarding.id, isPublished: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdate(hoarding.id, { is_published: next })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-sm font-medium text-foreground">{POSITION_LABELS[hoarding.position]}</p>
        <button
          onClick={togglePublish}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            hoarding.is_published
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
        >
          {hoarding.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
          {hoarding.is_published ? 'Live' : 'Hidden'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        {/* Logo upload */}
        <div>
          <label className="block text-xs text-muted-foreground mb-2">Sponsor logo</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            }`}
          >
            <input {...getInputProps()} />
            {hoarding.logo_url ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-full h-10 rounded flex items-center justify-center" style={{ background: bgColor }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hoarding.logo_url} alt="Sponsor logo" className="max-h-8 max-w-full object-contain" />
                </div>
                <p className="text-xs text-muted-foreground">Drop new image to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-2">
                {uploading
                  ? <span className="text-xs text-muted-foreground">Uploading…</span>
                  : <>
                    <Upload size={18} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {isDragActive ? 'Drop logo here' : 'Drop sponsor logo or click to upload'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">PNG, JPG, SVG, WebP · max 2MB</p>
                  </>
                }
              </div>
            )}
          </div>
        </div>

        {/* Background colour */}
        <div>
          <label className="block text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5"><Palette size={11} /> Background colour</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={e => setBgColor(e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border border-border flex-shrink-0"
            />
            <input
              type="text"
              value={bgColor}
              onChange={e => setBgColor(e.target.value)}
              className="flex-1 text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={7}
            />
          </div>
        </div>

        {/* Link URL */}
        <div>
          <label className="block text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5"><Link size={11} /> Sponsor website (optional)</span>
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://sponsor.com"
            className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : <><Check size={14} /> Save changes</>}
        </button>
      </div>
    </div>
  )
}

export function HoardingsClient({ initialHoardings }: { initialHoardings: Hoarding[] }) {
  const [hoardings, setHoardings] = useState<Hoarding[]>(initialHoardings)

  function handleUpdate(id: string, updates: Partial<Hoarding>) {
    setHoardings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Pitchside hoardings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the four sponsor hoarding positions around the pitch. Upload your sponsor's logo,
          set their brand colour, and publish when ready. Unpublished slots show a neutral fill on the board.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {hoardings.map(h => (
          <HoardingSlot key={h.id} hoarding={h} onUpdate={handleUpdate} />
        ))}
      </div>

      <div className="mt-6 border border-border rounded-lg px-4 py-3 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Artwork spec:</strong> PNG or SVG, minimum 300px wide,
          transparent background preferred. Horizontal format for top/bottom hoardings,
          vertical for left/right. Maximum file size 2MB.
        </p>
      </div>
    </div>
  )
}
