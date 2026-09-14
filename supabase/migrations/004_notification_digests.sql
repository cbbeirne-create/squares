-- Stadium Squares — timezone-aware daily notification digests

alter table public.notification_preferences
  add column if not exists timezone text not null default 'Europe/Dublin',
  add column if not exists last_digest_sent_at timestamptz;

alter table public.notification_preferences
  add constraint notification_timezone_not_blank
  check (length(trim(timezone)) > 0) not valid;

create index if not exists idx_notification_daily_digest
  on public.notification_preferences (daily_digest)
  where daily_digest = true;
