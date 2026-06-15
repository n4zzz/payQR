-- ============================================================================
-- PayQR — initial schema
-- profiles · payment_methods · split_sessions · split_shares
-- + Row-Level Security and the claim/confirm handshake functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles : public identity, 1:1 with an auth user
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text,
  bio          text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Usernames that collide with app routes (or are otherwise reserved).
create table public.reserved_usernames ( name text primary key );
insert into public.reserved_usernames (name) values
  ('dashboard'),('login'),('logout'),('signup'),('onboarding'),('settings'),
  ('api'),('s'),('about'),('help'),('admin'),('app'),('www'),('payqr');

-- ----------------------------------------------------------------------------
-- payment_methods : the QRs a user shares on their wallet
-- ----------------------------------------------------------------------------
create table public.payment_methods (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  provider      text not null default 'other'
                  check (provider in ('tng','mae','grab','bank','other')),
  label         text not null,
  hint          text,
  qr_image_path text not null,          -- path in the 'qr-codes' storage bucket
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index payment_methods_profile_idx
  on public.payment_methods (profile_id, sort_order);

-- ----------------------------------------------------------------------------
-- split_sessions : one bill / event ("session" in the UI)
-- ----------------------------------------------------------------------------
create table public.split_sessions (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  subtotal    numeric(10,2) not null check (subtotal >= 0),
  service_pct numeric(5,2)  not null default 10 check (service_pct >= 0),
  sst_pct     numeric(5,2)  not null default 6  check (sst_pct >= 0),
  total       numeric(10,2) not null check (total >= 0),
  headcount   int           not null check (headcount > 0),  -- includes host
  share_slug  text unique   not null,                        -- unguessable link key
  status      text not null default 'open' check (status in ('open','settled')),
  created_at  timestamptz not null default now()
);
create index split_sessions_host_idx on public.split_sessions (host_id, created_at desc);

-- ----------------------------------------------------------------------------
-- split_shares : one row per participant (incl. host); name is free text so
-- friends can pay back without an account
-- ----------------------------------------------------------------------------
create table public.split_shares (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.split_sessions(id) on delete cascade,
  name         text not null,
  amount       numeric(10,2) not null check (amount >= 0),
  state        text not null default 'unpaid'
                 check (state in ('host','unpaid','claimed','confirmed')),
  claimed_at   timestamptz,
  confirmed_at timestamptz
);
create index split_shares_session_idx on public.split_shares (session_id);

-- ============================================================================
-- Row-Level Security
-- The unguessable share_slug is the capability for session pages; tables are
-- publicly readable, but writes are funnelled through the functions below.
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.payment_methods enable row level security;
alter table public.split_sessions  enable row level security;
alter table public.split_shares    enable row level security;

-- profiles: world-readable, owner-writable
create policy "profiles are public"
  on public.profiles for select using (true);
create policy "owner manages own profile"
  on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- payment_methods: world-readable, owner CRUD
create policy "methods are public"
  on public.payment_methods for select using (true);
create policy "owner manages own methods"
  on public.payment_methods for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- split_sessions: world-readable (slug is the gate), host CRUD
create policy "sessions are public"
  on public.split_sessions for select using (true);
create policy "host manages own sessions"
  on public.split_sessions for all
  using (host_id = auth.uid()) with check (host_id = auth.uid());

-- split_shares: world-readable; direct writes only by the host. Friends move a
-- share to 'claimed' via the claim_share() function (no account needed).
create policy "shares are public"
  on public.split_shares for select using (true);
create policy "host manages own shares"
  on public.split_shares for all
  using (
    exists (select 1 from public.split_sessions s
            where s.id = session_id and s.host_id = auth.uid())
  )
  with check (
    exists (select 1 from public.split_sessions s
            where s.id = session_id and s.host_id = auth.uid())
  );

-- ============================================================================
-- Handshake functions
-- ============================================================================

-- A friend (anonymous, with the link) marks their share as paid.
-- Only allows the unpaid -> claimed transition; cannot touch amounts or confirm.
create or replace function public.claim_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_shares
     set state = 'claimed', claimed_at = now()
   where id = p_share_id
     and state = 'unpaid';
end;
$$;

-- A friend undoes their own claim (claimed -> unpaid), e.g. tapped by mistake.
create or replace function public.unclaim_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_shares
     set state = 'unpaid', claimed_at = null
   where id = p_share_id
     and state = 'claimed';
end;
$$;

grant execute on function public.claim_share(uuid)   to anon, authenticated;
grant execute on function public.unclaim_share(uuid) to anon, authenticated;

-- Host confirms money arrived (claimed -> confirmed) for one of their shares.
create or replace function public.confirm_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_shares sh
     set state = 'confirmed', confirmed_at = now()
    from public.split_sessions s
   where sh.id = p_share_id
     and sh.session_id = s.id
     and s.host_id = auth.uid()
     and sh.state in ('claimed','unpaid');
end;
$$;
grant execute on function public.confirm_share(uuid) to authenticated;

-- ============================================================================
-- Auto-create a profile row when a user signs up (username chosen at onboarding;
-- a temporary one is generated to satisfy NOT NULL / UNIQUE).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    new.raw_user_meta_data->>'full_name'  -- never the email; profiles are public. Set at onboarding.
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Storage: public-read bucket for QR images; owner-only writes to own folder.
-- Path convention: {profile_id}/{method_id}.png
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

create policy "qr images are public"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

create policy "owner uploads own qr images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'qr-codes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner updates own qr images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'qr-codes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner deletes own qr images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'qr-codes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
