-- ============================================================
-- Stadium Squares — Development Seed Data
-- ============================================================

-- Sample client: Munster Rugby
insert into public.clients (
  id, slug, club_name, sport, status,
  primary_color, secondary_color, accent_color,
  promo_headline, promo_subheadline, promo_body,
  grid_cols, grid_rows, price_per_square, currency, currency_symbol,
  notification_email, stripe_onboarded, platform_fee_monthly, archive_fee_monthly,
  launched_at
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'munster-rugby',
  'Munster Rugby',
  'rugby',
  'active',
  '#B22222', '#8B0000', '#FFD700',
  'Own your place in Thomond Park history',
  'Claim a square on our pitch. Leave your name and a memory. Forever.',
  'Every square on this board is a Munster fan. Purchase yours, leave your name and a personal message — a memory of your favourite match, a tribute to someone special, or simply your pride in the red jersey. Your square is permanent.',
  28, 18, 10.00, 'EUR', '€',
  'commercial@munsterrugby.ie',
  false, 49.00, 9.00,
  now()
);

-- Sample hoardings for Munster
insert into public.hoardings (client_id, position, bg_color, is_published)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'top',    '#1a1a1a', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bottom', '#1a1a1a', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'left',   '#1a1a1a', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'right',  '#1a1a1a', false);

-- Sample notification preferences
insert into public.notification_preferences (client_id, notification_email, new_purchase_alert, daily_digest)
values ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'commercial@munsterrugby.ie', true, false);

-- Sample reserved squares (club crest area — centre of pitch)
insert into public.squares (client_id, grid_x, grid_y, status, is_reserved, reserved_label)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 13, 8, 'reserved', true, 'Club crest'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 14, 8, 'reserved', true, 'Club crest'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 13, 9, 'reserved', true, 'Club crest'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 14, 9, 'reserved', true, 'Club crest');

-- Sample published squares (fan tributes)
insert into public.squares (client_id, grid_x, grid_y, status, fan_name, fan_message, fan_email, purchased_at, published_at)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2,  3,  'published', 'Seán Murphy',    'Heineken Cup Final 2006 — the greatest day of my life. Dad would have loved this.',         'sean@example.com',   now() - interval '10 days', now() - interval '9 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5,  7,  'published', 'Mary O''Brien',   'Season ticket holder since 1987. This club is in my blood.',                                  'mary@example.com',   now() - interval '9 days',  now() - interval '8 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  2,  'published', 'Ciarán Walsh',    'For Grandad, who brought me to my first game in 1994. Never forgotten.',                      'ciaran@example.com', now() - interval '8 days',  now() - interval '7 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3,  14, 'published', 'Aoife Doyle',     'Leinster v Munster, December 2014 — the cold, the noise, the magic.',                        'aoife@example.com',  now() - interval '7 days',  now() - interval '6 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 18, 5,  'published', 'Padraig Kelly',   'My son''s first match, age 4. He''s hooked for life now.',                                    'padraig@example.com',now() - interval '6 days',  now() - interval '5 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 22, 11, 'published', 'Siobhán Lynch',   'In memory of Mam, who never missed a home game in 30 years.',                                'siobhan@example.com',now() - interval '5 days',  now() - interval '4 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7,  16, 'published', 'Tomás Ryan',      'Back-to-back Heineken Cups. Nothing will ever top that.',                                     'tomas@example.com',  now() - interval '4 days',  now() - interval '3 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 25, 4,  'published', 'Fiona Burke',     'This club got me through some dark times. Forever grateful.',                                 'fiona@example.com',  now() - interval '3 days',  now() - interval '2 days'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 11, 10, 'published', 'Declan Noonan',   'Ronan O''Gara. Greatest of all time. No debate.',                                             'declan@example.com', now() - interval '2 days',  now() - interval '1 day'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 16, 13, 'published', 'Niamh Fitzgerald','Three generations of our family have stood in Thomond Park. Here''s to three more.',          'niamh@example.com',  now() - interval '1 day',   now());

-- Sample pending squares (awaiting moderation)
insert into public.squares (client_id, grid_x, grid_y, status, fan_name, fan_message, fan_email, purchased_at)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 20, 7,  'pending', 'Brian Connolly', 'First game was the 2008 Heineken Cup win. Changed my life.',   'brian@example.com', now() - interval '2 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8,  12, 'pending', 'Emer Galvin',    'For my late father Pádraic. A Munster man to the last breath.','emer@example.com',  now() - interval '1 hour');
