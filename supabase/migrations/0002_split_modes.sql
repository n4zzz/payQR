-- ============================================================================
-- PayQR — split modes: equal vs itemized
-- Adds a mode flag to sessions and a per-person itemized order to shares.
-- Safe to run on the existing DB (idempotent).
-- ============================================================================

alter table public.split_sessions
  add column if not exists split_mode text not null default 'equal'
  check (split_mode in ('equal', 'itemized'));

-- Per-person meal order for itemized mode: jsonb array of { name, price }.
-- Null for equal mode / the host's covered row.
alter table public.split_shares
  add column if not exists items jsonb;
