-- Run this once in the Supabase SQL editor against an existing database.
-- supabase/schema.sql already contains the same changes for a fresh rebuild.
--
-- 1. Posts had no DELETE policy, so RLS rejected every delete: the request
--    succeeded but removed zero rows, making "Delete post" silently do nothing.
-- 2. "Delete chat" is per-user. Rather than deleting the shared conversation
--    row (which would wipe the other person's history too), each user records
--    a cutoff and the client hides messages at or before it.

create policy "authors can delete own posts"
on public.posts for delete
using (author_id = auth.uid() and public.is_verified_college_user());

create table if not exists public.conversation_clears (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  cleared_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_clears enable row level security;

create policy "users manage own conversation clears"
on public.conversation_clears for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
