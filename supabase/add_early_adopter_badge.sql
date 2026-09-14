-- Run this in Supabase SQL Editor
--
-- Additive migration: allows 'early_adopter' as a badge_type so every new
-- signup can be given a welcome badge (so nobody's badge grid is ever
-- completely empty/gray). Postgres auto-names an inline check constraint
-- "<table>_<column>_check" - if your database has a different name for it
-- (e.g. you renamed it), adjust the constraint name below before running.

alter table public.badges drop constraint if exists badges_badge_type_check;

alter table public.badges add constraint badges_badge_type_check check (badge_type in (
  'first_session',
  'five_star_mentor',
  'collaborator',
  'github_pro',
  'on_a_roll',
  'campus_legend',
  'early_adopter'
));
