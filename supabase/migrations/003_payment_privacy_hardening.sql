-- Stadium Squares — payment, privacy and tenant-isolation hardening

alter table public.squares
  add column if not exists payment_status text not null default 'payment_pending'
    check (payment_status in ('payment_pending', 'paid', 'failed', 'refunded')),
  add column if not exists resubmission_token_hash text,
  add column if not exists reservation_expires_at timestamptz;

update public.squares
set payment_status = case
  when payment_confirmed_at is not null then 'paid'
  else 'payment_pending'
end
where payment_status is null or payment_status = 'payment_pending';

alter table public.squares
  add constraint squares_grid_coordinates_nonnegative
  check (grid_x >= 0 and grid_y >= 0) not valid;

alter table public.clients
  add constraint clients_grid_dimensions_positive
  check (grid_cols > 0 and grid_rows > 0) not valid,
  add constraint clients_price_positive
  check (price_per_square > 0) not valid,
  add constraint clients_currency_supported
  check (currency in ('EUR', 'GBP', 'USD')) not valid;

create unique index if not exists idx_squares_payment_intent_unique
  on public.squares (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists idx_squares_payment_cleanup
  on public.squares (reservation_expires_at)
  where payment_status = 'payment_pending';

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

create table if not exists public.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean;
begin
  insert into public.api_rate_limits(rate_key, window_started_at, request_count)
  values (p_key, now(), 1)
  on conflict (rate_key) do update
  set
    window_started_at = case
      when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else api_rate_limits.window_started_at
    end,
    request_count = case
      when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else api_rate_limits.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select role from public.app_users where id = auth.uid()
$$;

create or replace function public.current_user_client_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select client_id from public.app_users where id = auth.uid()
$$;

-- Public access goes through the application's deliberately shaped API responses.
revoke select on public.clients, public.squares, public.hoardings, public.campaign_analytics from anon;

-- Authenticated club users may read their tenant but all writes go through
-- authorised server routes. This prevents direct Supabase calls bypassing workflow.
drop policy if exists "Club admin can update own client promo/notifications" on public.clients;
drop policy if exists "Club admin can manage own client squares" on public.squares;
drop policy if exists "Club admin manages own hoardings" on public.hoardings;
drop policy if exists "Club admin manages own" on public.notification_preferences;

create policy "Club admin reads own squares"
  on public.squares for select
  using (client_id = public.current_user_client_id());

create policy "Club admin reads own hoardings"
  on public.hoardings for select
  using (client_id = public.current_user_client_id());

create policy "Club admin reads own notification preferences"
  on public.notification_preferences for select
  using (client_id = public.current_user_client_id());

create or replace view public.campaign_analytics
with (security_invoker = true)
as
select
  c.id as client_id,
  c.slug,
  c.club_name,
  c.currency_symbol,
  c.grid_cols * c.grid_rows as total_squares,
  count(s.id) filter (where s.status = 'published' and s.payment_status = 'paid') as sold_squares,
  count(s.id) filter (where s.status = 'pending' and s.payment_status = 'paid') as pending_squares,
  count(s.id) filter (where s.is_reserved = true) as reserved_squares,
  (c.grid_cols * c.grid_rows)
    - count(s.id) filter (
        where s.is_reserved = true
           or s.payment_status in ('payment_pending', 'paid')
      ) as available_squares,
  coalesce(
    sum(c.price_per_square) filter (
      where s.status = 'published' and s.payment_status = 'paid'
    ), 0
  ) as revenue_raised,
  round(
    count(s.id) filter (
      where s.status = 'published' and s.payment_status = 'paid'
    )::numeric / nullif(c.grid_cols * c.grid_rows, 0) * 100,
    1
  ) as percent_sold
from public.clients c
left join public.squares s on s.client_id = c.id
group by c.id;

revoke select on public.campaign_analytics from anon;
grant select on public.campaign_analytics to authenticated;
