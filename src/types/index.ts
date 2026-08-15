// ─── Sport Templates ────────────────────────────────────────────────────────

export type SportTemplate = 'rugby' | 'gaa' | 'soccer'

export interface PitchDimensions {
  widthM: number
  lengthM: number
  aspectRatio: number
}

export const PITCH_DIMENSIONS: Record<SportTemplate, PitchDimensions> = {
  rugby:  { widthM: 70,  lengthM: 100, aspectRatio: 100 / 70 },
  gaa:    { widthM: 82,  lengthM: 137, aspectRatio: 137 / 82 },
  soccer: { widthM: 68,  lengthM: 105, aspectRatio: 105 / 68 },
}

// ─── Club / Client ───────────────────────────────────────────────────────────

export interface ClubTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

export interface StandGraphics {
  top:    string | null  // Supabase Storage URL
  bottom: string | null
  left:   string | null
  right:  string | null
}

export interface HoardingSlot {
  id: string
  position: 'top' | 'bottom' | 'left' | 'right'
  logoUrl: string | null
  linkUrl: string | null
  bgColor: string
  isPublished: boolean
}

export interface PromoContent {
  headline:    string
  subheadline: string
  body:        string
}

export interface Client {
  id:                  string
  slug:                string           // subdomain key e.g. "munster-rugby"
  clubName:            string
  sport:               SportTemplate
  theme:               ClubTheme
  standGraphics:       StandGraphics
  hoardings:           HoardingSlot[]
  promo:               PromoContent
  gridCols:            number
  gridRows:            number
  pricePerSquare:      number
  currency:            string           // "EUR" | "GBP" | "USD"
  currencySymbol:      string           // "€" | "£" | "$"
  notificationEmail:   string
  stripeAccountId:     string | null    // Stripe Connect account ID
  stripeOnboarded:     boolean
  platformFeeMonthly:  number
  archiveFeeMonthly:   number
  status:              ClientStatus
  launchedAt:          string | null
  soldOutAt:           string | null
  createdAt:           string
}

export type ClientStatus = 'setup' | 'active' | 'sold_out' | 'archived'

// ─── Squares ─────────────────────────────────────────────────────────────────

export type SquareStatus = 'available' | 'pending' | 'published' | 'reserved'

export interface Square {
  id:          string
  clientId:    string
  gridX:       number
  gridY:       number
  status:      SquareStatus
  fanName:     string | null
  fanMessage:  string | null
  fanEmail:    string | null
  purchasedAt: string | null
  publishedAt: string | null
  rejectedAt:  string | null
  stripePaymentIntentId: string | null
  isReserved:  boolean
  reservedLabel: string | null          // e.g. "Club crest" shown in admin
}

// ─── Moderation ──────────────────────────────────────────────────────────────

export interface ModerationItem {
  squareId:    string
  clientId:    string
  gridX:       number
  gridY:       number
  fanName:     string
  fanMessage:  string
  fanEmail:    string
  purchasedAt: string
}

export type ModerationAction = 'approve' | 'reject'

export interface ModerationDecision {
  squareId:      string
  action:        ModerationAction
  rejectionNote: string | null   // Sent to fan in rejection email
}

// ─── Purchase Flow ───────────────────────────────────────────────────────────

export interface PurchaseIntent {
  clientId:   string
  gridX:      number
  gridY:      number
  fanName:    string
  fanMessage: string
  fanEmail:   string
}

export interface PurchaseResult {
  success:          boolean
  clientSecret:     string | null
  paymentIntentId:  string | null
  squareId:         string | null
  error:            string | null
}

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'club_admin'

export interface AppUser {
  id:       string
  email:    string
  role:     UserRole
  clientId: string | null    // null for super_admin
  name:     string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface CampaignAnalytics {
  totalSquares:     number
  soldSquares:      number
  pendingSquares:   number
  reservedSquares:  number
  availableSquares: number
  revenueRaised:    number
  currency:         string
  currencySymbol:   string
  percentSold:      number
  recentPurchases:  RecentPurchase[]
  dailyVelocity:    DailyVelocity[]
}

export interface RecentPurchase {
  fanName:     string
  gridX:       number
  gridY:       number
  purchasedAt: string
}

export interface DailyVelocity {
  date:  string
  count: number
}

// ─── Email Notifications ──────────────────────────────────────────────────────

export type EmailType =
  | 'purchase_confirmation'
  | 'square_approved'
  | 'square_rejected'
  | 'resubmission_approved'
  | 'club_new_purchase'

export interface EmailPayload {
  type:         EmailType
  to:           string
  fanName:      string
  clubName:     string
  clubSlug:     string
  gridRef:      string       // e.g. "R4–C12"
  fanMessage?:  string
  rejectionNote?: string
  boardUrl?:    string
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export interface ShareCard {
  squareId:   string
  imageUrl:   string          // Generated OG image URL
  shareUrl:   string          // Board URL with square highlighted
  fanName:    string
  clubName:   string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  clientId:          string
  notificationEmail: string
  newPurchaseAlert:  boolean
  dailyDigest:       boolean
  digestTime:        string   // "08:00"
}
