-- Run this in the Supabase SQL Editor.
--
-- Adds the two database pieces the app already uses but that were never
-- applied to this project. Safe to run on existing data and safe to re-run:
-- it only adds missing columns and (re)creates one function.
--
-- 1. GitHub contribution calendar columns (from add_github_contributions.sql).
--    Without these, saving GitHub profile data fails, so no GitHub info
--    ever appears on anyone's profile.
alter table public.users
  add column if not exists github_contributions jsonb not null default '[]'::jsonb,
  add column if not exists github_total_contributions integer not null default 0;

-- 2. PeerCoins award function (from add_rewards.sql). Without it, no one is
--    ever awarded PeerCoins or levels up.
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

-- Make the API pick up the new columns and function immediately.
notify pgrst, 'reload schema';
