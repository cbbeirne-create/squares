import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Client, SportTemplate, PitchDimensions } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function gridRef(x: number, y: number): string {
  return `R${y + 1}–C${x + 1}`
}

export function parseGridRef(ref: string): { x: number; y: number } | null {
  const match = ref.match(/R(\d+)–C(\d+)/)
  if (!match) return null
  return { x: parseInt(match[2]) - 1, y: parseInt(match[1]) - 1 }
}

export function formatCurrency(amount: number, symbol: string, currency: string): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 30)  return `${days}d ago`
  return formatDate(iso)
}

export function percentSold(sold: number, total: number): number {
  if (total === 0) return 0
  return Math.round((sold / total) * 100)
}

export function squaresRemaining(client: Client, sold: number, pending: number, reserved: number): number {
  return client.gridCols * client.gridRows - sold - pending - reserved
}

export function boardUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stadiumsquares.io'
  return `${base}/board/${slug}`
}

export function pitchAspectRatio(sport: SportTemplate): number {
  const ratios: Record<SportTemplate, number> = {
    rugby:  100 / 70,
    gaa:    137 / 82,
    soccer: 105 / 68,
  }
  return ratios[sport]
}

// Returns optimal grid cols/rows to match pitch aspect ratio
export function suggestGridDimensions(
  sport: SportTemplate,
  targetTotal: number
): { cols: number; rows: number } {
  const ratio = pitchAspectRatio(sport)
  // cols / rows ≈ ratio (landscape pitch)
  const rows = Math.round(Math.sqrt(targetTotal / ratio))
  const cols = Math.round(targetTotal / rows)
  return { cols, rows }
}

export function clubCssVars(client: Pick<Client, 'theme'>): Record<string, string> {
  return {
    '--club-primary':   client.theme.primaryColor,
    '--club-secondary': client.theme.secondaryColor,
    '--club-accent':    client.theme.accentColor,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateMessage(message: string): string | null {
  if (message.length > 160) return 'Message must be 160 characters or fewer'
  const banned = /\b(fuck|shit|cunt|bastard|dick|cock|pussy|bitch)\b/i
  if (banned.test(message)) return 'Message contains inappropriate language'
  return null
}

export function validateFanName(name: string): string | null {
  if (!name.trim()) return 'Name is required'
  if (name.trim().length < 2) return 'Name must be at least 2 characters'
  if (name.length > 60) return 'Name must be 60 characters or fewer'
  return null
}

export function validateEmail(email: string): string | null {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email)) return 'Please enter a valid email address'
  return null
}
