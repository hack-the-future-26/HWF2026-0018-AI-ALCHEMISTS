-- Run this in Supabase SQL Editor
--
-- Additive migration: adds the GitHub contribution calendar (the little
-- green heatmap from a GitHub profile) as columns on public.users. Safe to
-- run once on top of existing data.

alter table public.users
  add column if not exists github_contributions jsonb not null default '[]'::jsonb,
  add column if not exists github_total_contributions integer not null default 0;
