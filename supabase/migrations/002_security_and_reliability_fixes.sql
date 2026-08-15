-- ============================================================
-- Stadium Squares — Security & Reliability Fixes
-- Migration: 002_security_and_reliability_fixes
--
-- Fixes two issues found in architecture review:
--
-- 1. CRITICAL: "Anyone can insert pending square" RLS policy allowed
--    any client holding the public anon key to insert square rows
--    directly, completely bypassing payment. This let an attacker
--    permanently squat every square on a board for free, since the
--    unique (client_id, grid_x, grid_y) constraint would then block
--    legitimate purchases. Removed entirely — all inserts now go
--    through the service-role client in the API route, which is the
--    only path that can create a square.
--
-- 2. Payment confirmation was being tracked by overloading
--    stripe_payment_intent_id (null vs non-null), but that field was
--    set to a non-null value at insert time — before payment was ever
--    attempted. This meant the payment_intent.payment_failed webhook's
--    cleanup query could never match, so abandoned or failed checkouts
--    permanently squatted squares with no way to release them. Fixed
--    by adding a dedicated payment_confirmed_at column and a TTL sweep
--    for checkouts that were abandoned entirely (no webhook ever fires
--    for a payment that was never attempted).
-- ============================================================

-- ─── Fix 1: Remove the payment-bypassing insert policy ────────

drop policy if exists "Anyone can insert pending square" on public.squares;

-- No replacement insert policy is added. Square rows are only ever
-- created by the service-role client inside /api/purchase/create-intent,
-- which enforces input validation and requires a successful Stripe
-- PaymentIntent to exist first. Service role bypasses RLS entirely,
-- so no anon/authenticated insert policy is needed or wanted here.

-- ─── Fix 2: Separate payment confirmation from intent linkage ──

alter table public.squares
  add column if not exists payment_confirmed_at timestamptz;

comment on column public.squares.payment_confirmed_at is
  'Set by the Stripe webhook on payment_intent.succeeded. Null means '
  'payment has not been confirmed yet — used to distinguish a square '
  'that is genuinely mid-checkout from one that was abandoned or failed, '
  'both by the payment_failed webhook and by the stale-square TTL sweep.';

-- Index to make the TTL sweep query and failed-payment cleanup cheap
create index if not exists idx_squares_unconfirmed_pending
  on public.squares (purchased_at)
  where status = 'pending' and payment_confirmed_at is null;
