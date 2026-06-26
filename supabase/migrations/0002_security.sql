-- ============================================================================
-- PayQR — security hardening
-- ============================================================================

-- ----------------------------------------------------------------------------
-- split_shares: track who claimed/unclaimed so we can authorize undo actions.
-- ----------------------------------------------------------------------------
alter table public.split_shares
  add column if not exists claimed_by   uuid references auth.users(id) on delete set null,
  add column if not exists unclaimed_by uuid references auth.users(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Reserved usernames: enforce at the database level, not just client-side.
-- ----------------------------------------------------------------------------
create or replace function public.check_reserved_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.reserved_usernames where name = new.username) then
    raise exception 'Username "%" is reserved.', new.username;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_reserved_username on public.profiles;
create trigger trg_check_reserved_username
  before insert or update on public.profiles
  for each row execute function public.check_reserved_username();

-- ----------------------------------------------------------------------------
-- claim_share: friend marks a share as paid.
-- Only transitions unpaid -> claimed. The share must belong to a real session.
-- For authenticated callers we record their user id; anonymous callers leave it NULL.
-- ----------------------------------------------------------------------------
create or replace function public.claim_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_shares sh
     set state      = 'claimed',
         claimed_at = now(),
         claimed_by = auth.uid()
    from public.split_sessions s
   where sh.id = p_share_id
     and sh.session_id = s.id
     and sh.state = 'unpaid';
end;
$$;

-- ----------------------------------------------------------------------------
-- unclaim_share: undo an accidental claim.
-- - If the claim was made by an authenticated user, only that same user can undo it.
-- - If the claim was anonymous (claimed_by is NULL), undo is allowed within 10 minutes
--   of the claim so a mistaken tap can be corrected, but old claims stay locked.
-- ----------------------------------------------------------------------------
create or replace function public.unclaim_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_shares sh
     set state        = 'unpaid',
         claimed_at   = null,
         claimed_by   = null,
         unclaimed_by = auth.uid()
    from public.split_sessions s
   where sh.id = p_share_id
     and sh.session_id = s.id
     and sh.state = 'claimed'
     and (
       (sh.claimed_by is not null and sh.claimed_by = auth.uid())
       or
       (sh.claimed_by is null and sh.claimed_at > now() - interval '10 minutes')
     );
end;
$$;

grant execute on function public.claim_share(uuid)   to anon, authenticated;
grant execute on function public.unclaim_share(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- confirm_share: host confirms money arrived.
-- Only transitions claimed -> confirmed. Host must own the session.
-- ----------------------------------------------------------------------------
create or replace function public.confirm_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_shares sh
     set state         = 'confirmed',
         confirmed_at  = now()
    from public.split_sessions s
   where sh.id = p_share_id
     and sh.session_id = s.id
     and s.host_id = auth.uid()
     and sh.state = 'claimed';
end;
$$;
grant execute on function public.confirm_share(uuid) to authenticated;
