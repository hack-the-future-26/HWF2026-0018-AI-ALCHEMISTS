-- Additive migration: adds GitHub profile columns to public.users, and lets
-- GitHub-authenticated accounts through the college-verification gate. GitHub
-- sign-in is treated as its own identity verification since a GitHub
-- account's email won't necessarily end in .edu/.ac.in like the existing
-- password-based signup requires. Safe to run once on top of existing data.

alter table public.users
  add column if not exists github_username text,
  add column if not exists github_bio text,
  add column if not exists github_avatar_url text,
  add column if not exists github_repos_count integer not null default 0,
  add column if not exists github_top_languages jsonb not null default '[]'::jsonb,
  add column if not exists github_recent_activity integer not null default 0;

create or replace function public.is_verified_college_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users auth_user
    where auth_user.id = auth.uid()
      and auth_user.email_confirmed_at is not null
      and (
        lower(auth_user.email) like '%.edu'
        or lower(auth_user.email) like '%.edu.%'
        or lower(auth_user.email) like '%.ac.in'
        or auth_user.raw_app_meta_data->>'provider' = 'github'
      )
  );
$$;
