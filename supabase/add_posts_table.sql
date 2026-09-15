-- Additive migration: adds the new public.posts table (campus feed posts),
-- its RLS policies, and enables realtime on it. Safe to run once on top of
-- your existing data - it doesn't touch any other table.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  tag text not null,
  body text not null,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts(created_at desc);

alter table public.posts enable row level security;

create policy "verified users can read posts"
on public.posts for select
using (public.is_verified_college_user());

create policy "verified users can create posts"
on public.posts for insert
with check (author_id = auth.uid() and public.is_verified_college_user());

alter table public.posts replica identity full;
alter publication supabase_realtime add table public.posts;
