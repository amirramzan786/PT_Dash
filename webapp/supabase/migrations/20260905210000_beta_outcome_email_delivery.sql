-- Project Steel: auditable, private delivery state for the post-verification
-- Founder / waitlist transactional emails. This is not an email address book:
-- the recipient remains in beta_signups, which is already private.

create table if not exists public.beta_outcome_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.beta_signups(id) on delete cascade,
  kind text not null check (kind in ('founder_confirmed', 'waitlist_confirmed')),
  provider_message_id text,
  sent_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (signup_id, kind)
);

alter table public.beta_outcome_email_deliveries enable row level security;

-- Delivery state and provider identifiers are operational data. Only the
-- privileged Edge Function may access it; it is never a browser API.
revoke all on table public.beta_outcome_email_deliveries from anon, authenticated;

