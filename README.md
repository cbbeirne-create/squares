# Stadium Squares

A white-label digital tribute board for sports clubs. Fans purchase individual squares on a pixel grid styled as a top-down view of their club's stadium, leaving a name and a personal message — a memory, a dedication, a tribute. Each campaign is a one-time, finite-square fundraiser that becomes a permanent digital monument once sold out.

Built for solo/small-team operation: one codebase serves unlimited clubs through a configuration layer, so onboarding a new client is a database record, not a code change.

---

## Stack

- **Frontend** — Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend** — Supabase (Postgres + Realtime + Storage + Auth)
- **Payments** — Stripe Connect (Express), direct-to-club, platform fee billed separately
- **Email** — Resend, club-branded transactional templates
- **Hosting** — Vercel, with a scheduled Cron job for stale-checkout cleanup

---

## Structure

```
src/
├── app/
│   ├── board/[slug]/       Fan-facing board (public)
│   ├── admin/              Club admin dashboard
│   ├── superadmin/         Platform admin — client onboarding, Stripe Connect, analytics
│   └── api/                Purchase flow, moderation, webhooks, cron
├── components/board/       Canvas grid, stadium surround, purchase/tribute panels
├── lib/                    Supabase clients, Stripe, email, pitch renderer, utils
└── types/                  Shared TypeScript types

supabase/
├── migrations/             Run in order: 001 then 002
└── seed/                   Sample club data for local development
```

---

## Getting started

Full step-by-step setup — Supabase, Stripe Connect, Resend, Vercel, and environment variables — is in **[docs/SETUP.md](docs/SETUP.md)**. Start there.

Quick version:

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Run both Supabase migrations, in order, before starting the app:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_security_and_reliability_fixes.sql
```

Migration 002 is not optional — it removes a Row Level Security policy that otherwise allows square insertion without payment.

---

## Key design decisions

| Decision | Why |
|---|---|
| Canvas-based grid, not DOM elements | Handles 1,000+ squares at 60fps on mobile |
| Squares reserved before Stripe is called | A losing race on a contested square fails on the DB constraint instead of wasting a Stripe API call |
| `payment_confirmed_at` separate from `stripe_payment_intent_id` | The intent ID is set immediately for traceability; only the webhook confirming real payment sets confirmation — this is what lets abandoned checkouts be released safely |
| Stripe Connect, direct-to-club | Platform never touches fan payments — simpler regulatory position, and fans trust their club, not a third party |
| One-time campaign, finite squares | Scarcity is a feature — creates urgency and a natural sell-out narrative for the club to promote |
| Moderation before publish | Fan tributes go live only after club admin approval — protects both the club's brand and the platform |

---

## Known follow-ups

- Real-time board subscription has no reconnection/backfill handling for dropped WebSocket connections
- No rate limiting yet on the public purchase endpoint
- `npm audit` flags a handful of high-severity findings in dev-only tooling (eslint/glob dependency chain) — not present in runtime code, safe to defer

See the architecture review history in project chat for the full reasoning behind the current data model and security fixes.
