-- Run this in Supabase SQL Editor
--
-- Additive migration: adds the PeerCoins/level/badges gamification system.
-- Safe to run once on top of existing data - it only adds columns/tables.

alter table public.users
  add column if not exists peer_coins integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists total_sessions_taught integer not null default 0,
  add column if not exists streak_days integer not null default 0;

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_type text not null check (badge_type in (
    'first_session',
    'five_star_mentor',
    'collaborator',
    'github_pro',
    'on_a_roll',
    'campus_legend'
  )),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_type)
);

create index if not exists badges_user_id_idx on public.badges(user_id);

alter table public.badges enable row level security;

-- Matches this app's existing policy style (public.is_verified_college_user())
-- rather than a bare `using (true)`/`auth.uid() = user_id`, so badges are
-- gated the same way every other table already is.
create policy "verified users can read badges"
on public.badges for select
using (public.is_verified_college_user());

create policy "users can insert own badges"
on public.badges for insert
with check (user_id = auth.uid() and public.is_verified_college_user());

-- Atomically increments peer_coins and recalculates level from the new
-- total, so the client never has to read-then-write a counter that a
-- second award (e.g. two triggers firing close together) could race with.
create or replace function public.award_peer_coins(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_amount <= 0 or not public.is_verified_college_user() then
    return;
  end if;

  update public.users
  set peer_coins = peer_coins + p_amount,
      level = case
        when peer_coins + p_amount >= 2000 then 5
        when peer_coins + p_amount >= 1000 then 4
        when peer_coins + p_amount >= 500 then 3
        when peer_coins + p_amount >= 200 then 2
        else 1
      end
  where id = p_user_id;
end;
$$;

grant execute on function public.award_peer_coins(uuid, integer) to authenticated;
