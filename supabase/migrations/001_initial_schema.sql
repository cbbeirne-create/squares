-- ============================================================
-- Stadium Squares — Complete Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── ENUMS ─────────────────────────────────────────────────

create type sport_template as enum ('rugby', 'gaa', 'soccer');
create type client_status   as enum ('setup', 'active', 'sold_out', 'archived');
create type square_status   as enum ('available', 'pending', 'published', 'reserved');
create type user_role       as enum ('super_admin', 'club_admin');
create type hoarding_pos    as enum ('top', 'bottom', 'left', 'right');

-- ─── USERS ─────────────────────────────────────────────────
-- Extends Supabase auth.users

create table public.app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        user_role not null default 'club_admin',
  client_id   uuid,                          -- null for super_admin
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── CLIENTS ───────────────────────────────────────────────

create table public.clients (
  id                    uuid primary key default uuid_generate_v4(),
  slug                  text not null unique,       -- subdomain key
  club_name             text not null,
  sport                 sport_template not null,
  status                client_status not null default 'setup',

  -- Theme
  primary_color         text not null default '#B22222',
  secondary_color       text not null default '#8B0000',
  accent_color          text not null default '#FFD700',

  -- Stand graphics (Supabase Storage paths)
  stand_top             text,
  stand_bottom          text,
  stand_left            text,
  stand_right           text,

  -- Promotional content
  promo_headline        text not null default 'Own your place in history',
  promo_subheadline     text not null default 'Claim a square. Leave your mark forever.',
  promo_body            text not null default 'Purchase a square on our pitch and leave your name and a personal message — visible to every fan who visits.',

  -- Grid configuration
  grid_cols             int not null default 30,
  grid_rows             int not null default 20,

  -- Pricing
  price_per_square      numeric(10,2) not null default 10.00,
  currency              text not null default 'EUR',
  currency_symbol       text not null default '€',

  -- Notifications
  notification_email    text not null,

  -- Stripe Connect
  stripe_account_id     text,
  stripe_onboarded      boolean not null default false,

  -- Platform billing
  platform_fee_monthly  numeric(10,2) not null default 49.00,
  archive_fee_monthly   numeric(10,2) not null default 9.00,

  -- Timestamps
  launched_at           timestamptz,
  sold_out_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Add FK after clients table exists
alter table public.app_users
  add constraint app_users_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

-- ─── HOARDINGS ─────────────────────────────────────────────

create table public.hoardings (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  position     hoarding_pos not null,
  logo_url     text,
  link_url     text,
  bg_color     text not null default '#1a1a1a',
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (client_id, position)
);

-- ─── SQUARES ───────────────────────────────────────────────

create table public.squares (
  id                        uuid primary key default uuid_generate_v4(),
  client_id                 uuid not null references public.clients(id) on delete cascade,
  grid_x                    int not null,
  grid_y                    int not null,
  status                    square_status not null default 'available',

  -- Fan data
  fan_name                  text,
  fan_message               text,
  fan_email                 text,

  -- Reservation (admin-only)
  is_reserved               boolean not null default false,
  reserved_label            text,

  -- Payment
  stripe_payment_intent_id  text,

  -- Moderation
  rejection_note            text,
  rejection_count           int not null default 0,

  -- Timestamps
  purchased_at              timestamptz,
  published_at              timestamptz,
  rejected_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (client_id, grid_x, grid_y)
);

-- ─── MODERATION LOG ────────────────────────────────────────

create table public.moderation_log (
  id             uuid primary key default uuid_generate_v4(),
  square_id      uuid not null references public.squares(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  admin_id       uuid not null references public.app_users(id),
  action         text not null check (action in ('approve', 'reject')),
  rejection_note text,
  created_at     timestamptz not null default now()
);

-- ─── NOTIFICATION PREFERENCES ──────────────────────────────

create table public.notification_preferences (
  id                   uuid primary key default uuid_generate_v4(),
  client_id            uuid not null unique references public.clients(id) on delete cascade,
  notification_email   text not null,
  new_purchase_alert   boolean not null default true,
  daily_digest         boolean not null default false,
  digest_time          text not null default '08:00',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── SHARE CARDS ───────────────────────────────────────────

create table public.share_cards (
  id          uuid primary key default uuid_generate_v4(),
  square_id   uuid not null unique references public.squares(id) on delete cascade,
  image_url   text not null,
  share_url   text not null,
  created_at  timestamptz not null default now()
);

-- ─── INDEXES ───────────────────────────────────────────────

create index idx_squares_client_id       on public.squares(client_id);
create index idx_squares_status          on public.squares(status);
create index idx_squares_client_status   on public.squares(client_id, status);
create index idx_squares_purchased_at    on public.squares(purchased_at desc);
create index idx_hoardings_client_id     on public.hoardings(client_id);
create index idx_clients_slug            on public.clients(slug);
create index idx_clients_status          on public.clients(status);
create index idx_moderation_log_square   on public.moderation_log(square_id);
create index idx_moderation_log_client   on public.moderation_log(client_id);

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at before update on public.clients
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.squares
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.hoardings
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.app_users
  for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.notification_preferences
  for each row execute procedure public.handle_updated_at();

-- ─── ANALYTICS VIEW ────────────────────────────────────────

create or replace view public.campaign_analytics as
select
  c.id                                                          as client_id,
  c.slug,
  c.club_name,
  c.currency_symbol,
  c.grid_cols * c.grid_rows                                     as total_squares,
  count(s.id) filter (where s.status = 'published')            as sold_squares,
  count(s.id) filter (where s.status = 'pending')              as pending_squares,
  count(s.id) filter (where s.is_reserved = true)              as reserved_squares,
  (c.grid_cols * c.grid_rows)
    - count(s.id) filter (where s.status != 'available')        as available_squares,
  coalesce(
    sum(c.price_per_square) filter (where s.status = 'published'), 0
  )                                                             as revenue_raised,
  round(
    count(s.id) filter (where s.status = 'published')::numeric
    / nullif(c.grid_cols * c.grid_rows, 0) * 100, 1
  )                                                             as percent_sold
from public.clients c
left join public.squares s on s.client_id = c.id
group by c.id;

-- ─── ROW LEVEL SECURITY ────────────────────────────────────

alter table public.app_users              enable row level security;
alter table public.clients                enable row level security;
alter table public.hoardings              enable row level security;
alter table public.squares                enable row level security;
alter table public.moderation_log         enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.share_cards            enable row level security;

-- Helper: get current user role
create or replace function public.current_user_role()
returns user_role as $$
  select role from public.app_users where id = auth.uid()
$$ language sql security definer stable;

-- Helper: get current user's client_id
create or replace function public.current_user_client_id()
returns uuid as $$
  select client_id from public.app_users where id = auth.uid()
$$ language sql security definer stable;

-- ── app_users policies ──
create policy "Users can read own record"
  on public.app_users for select
  using (id = auth.uid() or public.current_user_role() = 'super_admin');

create policy "Super admin can manage all users"
  on public.app_users for all
  using (public.current_user_role() = 'super_admin');

-- ── clients policies ──
create policy "Super admin full access to clients"
  on public.clients for all
  using (public.current_user_role() = 'super_admin');

create policy "Club admin can read own client"
  on public.clients for select
  using (id = public.current_user_client_id());

create policy "Club admin can update own client promo/notifications"
  on public.clients for update
  using (id = public.current_user_client_id());

create policy "Public can read active clients by slug"
  on public.clients for select
  using (status in ('active', 'sold_out'));

-- ── squares policies ──
create policy "Super admin full access to squares"
  on public.squares for all
  using (public.current_user_role() = 'super_admin');

create policy "Club admin can manage own client squares"
  on public.squares for all
  using (client_id = public.current_user_client_id());

create policy "Public can read published squares"
  on public.squares for select
  using (status = 'published' or is_reserved = true);

create policy "Anyone can insert pending square"
  on public.squares for insert
  with check (status = 'pending');

-- ── hoardings policies ──
create policy "Super admin full access"
  on public.hoardings for all
  using (public.current_user_role() = 'super_admin');

create policy "Club admin manages own hoardings"
  on public.hoardings for all
  using (client_id = public.current_user_client_id());

create policy "Public can read published hoardings"
  on public.hoardings for select
  using (is_published = true);

-- ── moderation_log policies ──
create policy "Super admin reads all"
  on public.moderation_log for select
  using (public.current_user_role() = 'super_admin');

create policy "Club admin reads own"
  on public.moderation_log for select
  using (client_id = public.current_user_client_id());

create policy "Club admin inserts own"
  on public.moderation_log for insert
  with check (client_id = public.current_user_client_id());

-- ── notification_preferences policies ──
create policy "Super admin full access"
  on public.notification_preferences for all
  using (public.current_user_role() = 'super_admin');

create policy "Club admin manages own"
  on public.notification_preferences for all
  using (client_id = public.current_user_client_id());

-- ── share_cards policies ──
create policy "Public can read share cards"
  on public.share_cards for select using (true);

create policy "Service role inserts share cards"
  on public.share_cards for insert
  with check (public.current_user_role() = 'super_admin');
