'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { Check, Upload, ChevronRight, ChevronLeft, Loader } from 'lucide-react'
import { slugify } from '@/lib/utils'
import type { SportTemplate } from '@/types'

type Step = 'basics' | 'theme' | 'stands' | 'grid' | 'review'
const STEPS: Step[] = ['basics', 'theme', 'stands', 'grid', 'review']
const STEP_LABELS: Record<Step, string> = {
  basics: 'Club basics',
  theme:  'Brand theme',
  stands: 'Stand graphics',
  grid:   'Grid & pricing',
  review: 'Review & launch',
}

interface Form {
  clubName:          string
  slug:              string
  sport:             SportTemplate
  notificationEmail: string
  primaryColor:      string
  secondaryColor:    string
  accentColor:       string
  standTop:          File | null
  standBottom:       File | null
  standLeft:         File | null
  standRight:        File | null
  gridCols:          number
  gridRows:          number
  pricePerSquare:    number
  currency:          string
  currencySymbol:    string
  platformFee:       number
  archiveFee:        number
}

function StandUpload({ label, position, file, onFile }: {
  label: string; position: string; file: File | null; onFile: (f: File) => void
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && onFile(files[0]),
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    maxFiles: 1,
  })

  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <p className="text-xs text-green-600 flex items-center justify-center gap-1">
            <Check size={12} /> {file.name}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Upload size={12} className="inline mr-1" />
            {isDragActive ? 'Drop here' : 'Upload'}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Grid Recommendation Engine ─────────────────────────────────────────────

interface FanBaseProfile {
  label:          string
  description:    string
  rangeMin:       number
  rangeMax:       number
  conversionRate: number   // % of fan base expected to purchase
  suggestedPrice: number   // recommended price per square
}

const FAN_BASE_PROFILES: FanBaseProfile[] = [
  {
    label:          'Local / community club',
    description:    'Parish GAA club, junior rugby, Sunday league. Tight-knit community, high loyalty.',
    rangeMin:       100,
    rangeMax:       500,
    conversionRate: 0.35,
    suggestedPrice: 10,
  },
  {
    label:          'Regional / semi-pro club',
    description:    'County GAA club, provincial rugby, semi-pro soccer. Established supporter base.',
    rangeMin:       500,
    rangeMax:       2000,
    conversionRate: 0.20,
    suggestedPrice: 15,
  },
  {
    label:          'Professional / top-flight club',
    description:    'Pro14 / URC rugby, League of Ireland, senior inter-county. Large, passionate following.',
    rangeMin:       2000,
    rangeMax:       10000,
    conversionRate: 0.12,
    suggestedPrice: 20,
  },
  {
    label:          'Major club / national profile',
    description:    'Munster, Leinster, major county teams. National and international fanbase.',
    rangeMin:       10000,
    rangeMax:       100000,
    conversionRate: 0.05,
    suggestedPrice: 25,
  },
]

// Pitch aspect ratios by sport — cols:rows
const PITCH_RATIOS: Record<SportTemplate, number> = {
  rugby:  100 / 70,   // 1.43
  gaa:    137 / 82,   // 1.67
  soccer: 105 / 68,   // 1.54
}

interface GridRecommendation {
  cols:          number
  rows:          number
  total:         number
  label:         string
  rationale:     string
  sellOutChance: 'high' | 'medium' | 'low'
  revenue:       number
}

function buildRecommendations(
  fanBase:       number,
  convRate:      number,
  price:         number,
  sport:         SportTemplate,
): GridRecommendation[] {
  const expectedBuyers = Math.round(fanBase * convRate)
  const ratio          = PITCH_RATIOS[sport]

  function makeGrid(targetSquares: number, label: string, rationale: string): GridRecommendation {
    // Fit cols/rows to pitch aspect ratio
    const rows = Math.max(8,  Math.round(Math.sqrt(targetSquares / ratio)))
    const cols = Math.max(10, Math.round(rows * ratio))
    const total = cols * rows
    const sellOutPct = expectedBuyers / total

    return {
      cols, rows, total, label, rationale,
      sellOutChance: sellOutPct >= 0.85 ? 'high' : sellOutPct >= 0.60 ? 'medium' : 'low',
      revenue: total * price,
    }
  }

  // Three tiers: conservative (90% fill), balanced (70% fill), ambitious (50% fill)
  const conservative = Math.round(expectedBuyers * 1.10)
  const balanced     = Math.round(expectedBuyers * 1.40)
  const ambitious    = Math.round(expectedBuyers * 2.00)

  return [
    makeGrid(conservative, 'Conservative', `Sized for ~90% sell-through based on your fan base. Fast sell-out creates momentum and urgency.`),
    makeGrid(balanced,     'Balanced',     `Sized for ~70% sell-through. Good revenue potential while remaining achievable.`),
    makeGrid(ambitious,    'Ambitious',    `Sized for ~50% sell-through. Maximum revenue ceiling — best if the club has strong marketing support.`),
  ]
}

const SELL_OUT_COLOURS = {
  high:   { bg: 'bg-green-50',  border: 'border-green-200', badge: 'bg-green-100 text-green-700',  label: 'High sell-out confidence' },
  medium: { bg: 'bg-amber-50',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700',  label: 'Medium sell-out confidence' },
  low:    { bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700',      label: 'Lower sell-out confidence' },
}

interface GridStepProps {
  form:   Form
  update: <K extends keyof Form>(key: K, value: Form[K]) => void
}

function GridStep({ form, update }: GridStepProps) {
  const [fanBaseIdx,   setFanBaseIdx]   = useState(1)
  const [customFanBase, setCustomFanBase] = useState('')
  const [useCustom,    setUseCustom]    = useState(false)
  const [selectedRec,  setSelectedRec]  = useState<number | null>(null)
  const [showManual,   setShowManual]   = useState(false)

  const profile    = FAN_BASE_PROFILES[fanBaseIdx]
  const fanBase    = useCustom
    ? (parseInt(customFanBase) || 0)
    : Math.round((profile.rangeMin + profile.rangeMax) / 2)

  const recommendations = fanBase > 0
    ? buildRecommendations(fanBase, profile.conversionRate, form.pricePerSquare, form.sport)
    : []

  function applyRecommendation(rec: GridRecommendation, idx: number) {
    setSelectedRec(idx)
    update('gridCols', rec.cols)
    update('gridRows', rec.rows)
    setShowManual(false)
  }

  const total = form.gridCols * form.gridRows

  return (
    <div className="space-y-5">

      {/* Step 1: Fan base profile */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-2">
          1. How large is the club's active fan base?
        </label>
        <div className="space-y-2">
          {FAN_BASE_PROFILES.map((p, i) => (
            <button
              key={i}
              onClick={() => { setFanBaseIdx(i); setUseCustom(false); setSelectedRec(null) }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                !useCustom && fanBaseIdx === i
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {p.rangeMin.toLocaleString()}–{p.rangeMax.toLocaleString()} fans
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ~{Math.round(p.conversionRate * 100)}% conversion
                  </p>
                </div>
              </div>
            </button>
          ))}

          {/* Custom fan base input */}
          <button
            onClick={() => { setUseCustom(true); setSelectedRec(null) }}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
              useCustom ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
            }`}
          >
            <p className="text-sm font-medium text-foreground">I know the exact number</p>
            {useCustom && (
              <input
                type="number"
                value={customFanBase}
                onChange={e => { setCustomFanBase(e.target.value); setSelectedRec(null) }}
                onClick={e => e.stopPropagation()}
                placeholder="e.g. 3500"
                min={1}
                className="mt-2 w-full text-sm px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </button>
        </div>
      </div>

      {/* Step 2: Price + currency */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            2. Price per square
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {form.currencySymbol}
            </span>
            <input
              type="number" min={1} max={999} step={1}
              value={form.pricePerSquare}
              onChange={e => { update('pricePerSquare', parseFloat(e.target.value)); setSelectedRec(null) }}
              className="w-full pl-7 pr-3 py-2.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Suggested: {form.currencySymbol}{profile.suggestedPrice} for this club type
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Currency</label>
          <select
            value={form.currency}
            onChange={e => {
              const sym = e.target.value === 'EUR' ? '€' : e.target.value === 'GBP' ? '£' : '$'
              update('currency', e.target.value)
              update('currencySymbol', sym)
            }}
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>

      {/* Step 3: Recommendations */}
      {recommendations.length > 0 && (
        <div className="border-t border-border pt-4">
          <label className="block text-xs font-medium text-foreground mb-3">
            3. Choose a grid size — based on ~{fanBase.toLocaleString()} active fans
          </label>
          <div className="space-y-2.5">
            {recommendations.map((rec, i) => {
              const colours = SELL_OUT_COLOURS[rec.sellOutChance]
              const isSelected = selectedRec === i

              return (
                <button
                  key={i}
                  onClick={() => applyRecommendation(rec, i)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : `${colours.border} ${colours.bg} hover:border-primary/50`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{rec.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colours.badge}`}>
                        {colours.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary text-primary-foreground">
                          Selected ✓
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-green-600 flex-shrink-0">
                      {form.currencySymbol}{rec.revenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2 flex-wrap">
                    <span><strong className="text-foreground">{rec.total.toLocaleString()}</strong> squares</span>
                    <span><strong className="text-foreground">{rec.cols}</strong> cols × <strong className="text-foreground">{rec.rows}</strong> rows</span>
                    <span>max revenue</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Manual override */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setShowManual(m => !m)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showManual ? '▲ Hide manual override' : '▼ Set grid size manually'}
        </button>

        {showManual && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Columns</label>
              <input
                type="number" min={10} max={80} value={form.gridCols}
                onChange={e => { update('gridCols', parseInt(e.target.value)); setSelectedRec(null) }}
                className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Rows</label>
              <input
                type="number" min={8} max={60} value={form.gridRows}
                onChange={e => { update('gridRows', parseInt(e.target.value)); setSelectedRec(null) }}
                className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* Current grid summary */}
      <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm">
        <div className="flex justify-between text-muted-foreground mb-1">
          <span>Current grid</span>
          <span className="font-medium text-foreground">
            {form.gridCols} × {form.gridRows} = {total.toLocaleString()} squares
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Maximum revenue</span>
          <span className="font-medium text-green-600">
            {form.currencySymbol}{(total * form.pricePerSquare).toLocaleString()}
          </span>
        </div>
        {fanBase > 0 && (
          <div className="flex justify-between text-muted-foreground mt-1">
            <span>Expected buyers</span>
            <span className="font-medium text-foreground">
              ~{Math.round(fanBase * profile.conversionRate).toLocaleString()} fans ({Math.round(profile.conversionRate * 100)}% of {fanBase.toLocaleString()})
            </span>
          </div>
        )}
      </div>

      {/* Platform fees — separated to bottom of step */}
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Monthly platform fee ({form.currencySymbol})
          </label>
          <input
            type="number" min={0} value={form.platformFee}
            onChange={e => update('platformFee', parseFloat(e.target.value))}
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Archive fee/month ({form.currencySymbol})
          </label>
          <input
            type="number" min={0} value={form.archiveFee}
            onChange={e => update('archiveFee', parseFloat(e.target.value))}
            className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

    </div>
  )
}

// ─── Main Onboarding Page ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step,    setStep]    = useState<Step>('basics')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState<Form>({
    clubName:          '',
    slug:              '',
    sport:             'rugby',
    notificationEmail: '',
    primaryColor:      '#B22222',
    secondaryColor:    '#8B0000',
    accentColor:       '#FFD700',
    standTop:          null,
    standBottom:       null,
    standLeft:         null,
    standRight:        null,
    gridCols:          28,
    gridRows:          18,
    pricePerSquare:    10,
    currency:          'EUR',
    currencySymbol:    '€',
    platformFee:       49,
    archiveFee:        9,
  })

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function nextStep() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }
  function prevStep() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v instanceof File) fd.append(k, v)
        else if (v !== null)   fd.append(k, String(v))
      })

      const res = await fetch('/api/superadmin/clients/create', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      router.push(`/superadmin/clients/${data.clientId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed')
    } finally {
      setSaving(false)
    }
  }

  const stepIdx = STEPS.indexOf(step)
  const total   = form.gridCols * form.gridRows

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">New client onboarding</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set up a new Stadium Squares board</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
              i < stepIdx  ? 'bg-primary text-primary-foreground' :
              i === stepIdx ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < stepIdx ? <Check size={12} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 rounded ${i < stepIdx ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="mb-2">
        <h2 className="text-base font-medium text-foreground">{STEP_LABELS[step]}</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="border border-border rounded-xl p-5 bg-background space-y-4">

        {/* ── BASICS ── */}
        {step === 'basics' && <>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Club name <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.clubName}
              onChange={e => { update('clubName', e.target.value); update('slug', slugify(e.target.value)) }}
              placeholder="Munster Rugby"
              className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">URL slug <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-0">
              <span className="text-sm text-muted-foreground bg-muted border border-input border-r-0 px-3 py-2.5 rounded-l-md">
                stadiumsquares.io/board/
              </span>
              <input
                type="text" value={form.slug}
                onChange={e => update('slug', slugify(e.target.value))}
                placeholder="munster-rugby"
                className="flex-1 text-sm px-3 py-2.5 rounded-r-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Sport <span className="text-red-500">*</span></label>
            <select
              value={form.sport}
              onChange={e => update('sport', e.target.value as SportTemplate)}
              className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="rugby">Rugby Union</option>
              <option value="gaa">GAA (Gaelic Football / Hurling)</option>
              <option value="soccer">Soccer / Football</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Club notification email <span className="text-red-500">*</span></label>
            <input
              type="email" value={form.notificationEmail}
              onChange={e => update('notificationEmail', e.target.value)}
              placeholder="commercial@club.ie"
              className="w-full text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </>}

        {/* ── THEME ── */}
        {step === 'theme' && <>
          <p className="text-xs text-muted-foreground">
            Set the club's brand colours. These drive the entire board appearance — stand colours, header, buttons and accents.
          </p>
          {[
            { key: 'primaryColor',   label: 'Primary colour (main brand colour)' },
            { key: 'secondaryColor', label: 'Secondary colour (darker shade)' },
            { key: 'accentColor',    label: 'Accent colour (buttons, highlights)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form[key as keyof Form] as string}
                  onChange={e => update(key as keyof Form, e.target.value as Form[keyof Form])}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <input
                  type="text"
                  value={form[key as keyof Form] as string}
                  onChange={e => update(key as keyof Form, e.target.value as Form[keyof Form])}
                  className="flex-1 text-sm px-3 py-2.5 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  maxLength={7}
                />
              </div>
            </div>
          ))}

          {/* Colour preview */}
          <div className="rounded-lg overflow-hidden border border-border mt-2">
            <div className="h-10 flex" style={{ background: form.primaryColor }}>
              <div className="flex-1" style={{ background: form.secondaryColor }} />
              <div className="w-16" style={{ background: form.accentColor }} />
            </div>
            <div className="p-3 bg-background">
              <div
                className="inline-block px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: form.primaryColor, color: '#fff' }}
              >
                Button example
              </div>
            </div>
          </div>
        </>}

        {/* ── STANDS ── */}
        {step === 'stands' && <>
          <p className="text-xs text-muted-foreground">
            Upload four stand graphic images — one for each side of the stadium. These should ideally be elevated photography of the club's actual stands. Recommended: PNG, minimum 800px wide. Unprovided stands will use the club's primary colour.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StandUpload label="Top stand" position="top" file={form.standTop} onFile={f => update('standTop', f)} />
            <StandUpload label="Bottom stand" position="bottom" file={form.standBottom} onFile={f => update('standBottom', f)} />
            <StandUpload label="Left stand" position="left" file={form.standLeft} onFile={f => update('standLeft', f)} />
            <StandUpload label="Right stand" position="right" file={form.standRight} onFile={f => update('standRight', f)} />
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Stand graphics can also be uploaded or replaced later from the client detail page.
          </p>
        </>}

        {/* ── GRID & PRICING ── */}
        {step === 'grid' && <GridStep form={form} update={update} />}

        {/* ── REVIEW ── */}
        {step === 'review' && <>
          <div className="space-y-3 text-sm">
            {[
              ['Club name',          form.clubName],
              ['URL slug',           `stadiumsquares.io/board/${form.slug}`],
              ['Sport',              form.sport],
              ['Notification email', form.notificationEmail],
              ['Primary colour',     form.primaryColor],
              ['Grid',               `${form.gridCols} × ${form.gridRows} = ${total} squares`],
              ['Price per square',   `${form.currencySymbol}${form.pricePerSquare}`],
              ['Max revenue',        `${form.currencySymbol}${(total * form.pricePerSquare).toLocaleString()}`],
              ['Platform fee',       `${form.currencySymbol}${form.platformFee}/month`],
              ['Archive fee',        `${form.currencySymbol}${form.archiveFee}/month`],
              ['Stand graphics',     [form.standTop, form.standBottom, form.standLeft, form.standRight].filter(Boolean).length + '/4 uploaded'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-foreground text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700 mt-2">
            After creating this client, you'll need to generate a Stripe Connect onboarding link and send it to the club before their board can go live.
          </div>
        </>}

      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          onClick={prevStep}
          disabled={stepIdx === 0}
          className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-md px-4 py-2 hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Back
        </button>

        {step !== 'review' ? (
          <button
            onClick={nextStep}
            className="flex items-center gap-1.5 bg-foreground text-background text-sm font-medium px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? <><Loader size={14} className="animate-spin" /> Creating…</> : <><Check size={14} /> Create client</>}
          </button>
        )}
      </div>
    </div>
  )
}
