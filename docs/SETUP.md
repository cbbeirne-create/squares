# Stadium Squares — Developer Setup Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works for development)
- A [Stripe](https://stripe.com) account with Connect enabled
- A [Resend](https://resend.com) account for transactional email
- A [Vercel](https://vercel.com) account for deployment

---

## 1. Clone and install

```bash
git clone https://github.com/your-org/stadium-squares
cd stadium-squares
npm install
```

---

## 2. Supabase setup

1. Create a new Supabase project at https://app.supabase.com
2. Go to **SQL Editor** and run the migrations **in order**:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_security_and_reliability_fixes.sql
   ```
   Migration 002 is not optional — it removes an RLS policy that otherwise
   allows unauthenticated square insertion, bypassing payment entirely.
3. Optionally run the seed for development data:
   ```
   supabase/seed/dev_seed.sql
   ```
4. Create three **Storage buckets** (all public):
   - `stand-graphics`
   - `hoarding-logos`
   - `share-cards`
5. Copy your project URL and anon/service keys into `.env.local`

---

## 3. Stripe setup

1. Enable **Stripe Connect** in your Stripe dashboard (Connect → Get started)
2. Set the Connect type to **Express**
3. Copy your publishable key, secret key into `.env.local`
4. Set up a webhook endpoint pointing to `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `account.updated` (for Connect onboarding completion)
5. Copy the webhook signing secret into `.env.local`

---

## 4. Resend setup

1. Create a [Resend](https://resend.com) account
2. Add and verify your sending domain (e.g. `stadiumsquares.io`)
3. Copy your API key into `.env.local`

---

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

---

## 6. Run locally

```bash
npm run dev
```

Visit:
- `http://localhost:3000/board/munster-rugby` — fan-facing board (requires seed data)
- `http://localhost:3000/admin/moderation` — club admin (requires auth)
- `http://localhost:3000/superadmin/clients` — super admin (requires auth)

---

## 7. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables** — including `CRON_SECRET`, which Vercel uses to authenticate its own scheduled call to `/api/cron/release-stale-squares` (defined in `vercel.json`, runs every 10 minutes to release squares abandoned mid-checkout).

Set up a custom domain or use subdomain routing for white-labelling (e.g. `munster.stadiumsquares.io`).

---

## Project structure

```
src/
├── app/
│   ├── board/[slug]/          # Fan-facing board (public)
│   ├── admin/                 # Club admin dashboard
│   │   ├── moderation/        # Approve/reject fan messages
│   │   ├── content/           # Edit promotional text
│   │   ├── hoardings/         # Manage sponsor hoardings
│   │   └── analytics/         # Campaign performance
│   ├── superadmin/            # Your platform admin
│   │   ├── clients/           # Manage all clubs
│   │   └── onboarding/        # New client setup
│   └── api/                   # API routes
│       ├── purchase/          # Stripe payment intents
│       ├── admin/             # Moderation, hoardings, export
│       ├── webhooks/          # Stripe webhooks
│       └── auth/              # Sign in/out
├── components/
│   ├── board/                 # Stadium, grid canvas, panels
│   ├── ui/                    # Shared UI primitives
│   ├── admin/                 # Admin-specific components
│   └── superadmin/            # Super admin components
├── lib/
│   ├── supabase/              # Server + browser Supabase clients
│   ├── stripe/                # Payment intents, Connect
│   ├── email/                 # Resend email templates
│   └── utils/                 # Helpers, pitch renderer, validators
└── types/                     # All TypeScript types
```

---

## Onboarding a new client (super admin flow)

1. Log into `/superadmin/clients` → **New client**
2. Enter club name, slug, sport template, grid size, price, currency, notification email
3. Set brand colours and stand banner text
4. Upload four stand graphics (top, bottom, left, right)
5. Generate Stripe Connect onboarding link → send to club
6. Once club completes Stripe onboarding, mark as active and launch

---

## Key architectural decisions

| Decision | Rationale |
|---|---|
| Canvas-based grid | Handles 1000+ squares at 60fps; DOM grid degrades at scale |
| Supabase Realtime | Zero-config WebSocket for live board updates across all visitors |
| Stripe Connect Express | Club receives 100% of fan payments; platform fee billed separately |
| Service role for moderation | Club admins can only access their own client data via RLS |
| Pending before payment confirmed | Prevents race conditions — square locked on payment intent creation |
| Per-client CSS variables | Entire board re-themes with 3 colour values, no code changes |
