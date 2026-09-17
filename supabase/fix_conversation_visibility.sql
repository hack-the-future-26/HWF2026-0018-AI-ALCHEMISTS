-- Run this once in the Supabase SQL editor against the live database.
--
-- Three things were missing in production and together they made a new chat
-- invisible to the person who did not start it:
--
-- 1. public.conversation_clears never existed (add_delete_policies.sql was
--    never applied). fetchConversations() selects from it on every load, so
--    the query errored and the whole conversation list came back empty. The
--    only chats a user could see were the ones their own client had just
--    created locally - which is why both sides had to message first, and why
--    the first message from the other side never appeared.
-- 2. public.conversations was never added to the realtime publication, so the
--    "a new conversation was created for you" subscriptions never fired.
-- 3. The unique peer-pair index was never applied, so a double-submit could
--    still split one chat into two rows. Production has one such pair today.
--
-- Everything below is idempotent and safe to re-run.

-- ---- 1. per-user "delete chat" cutoffs (from add_delete_policies.sql) ----

create table if not exists public.conversation_clears (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  cleared_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_clears enable row level security;

drop policy if exists "users manage own conversation clears" on public.conversation_clears;
create policy "users manage own conversation clears"
on public.conversation_clears for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Posts had no DELETE policy either, so "Delete post" silently removed nothing.
drop policy if exists "authors can delete own posts" on public.posts;
create policy "authors can delete own posts"
on public.posts for delete
using (author_id = auth.uid() and public.is_verified_college_user());

-- ---- 2. realtime for new conversations ----

alter table public.conversations replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end
$$;

-- ---- 3. one conversation row per pair (from add_conversation_unique_pair.sql) ----

create temporary table conversation_dedupe as
select
  id,
  least(peer_a, peer_b) as p1,
  greatest(peer_a, peer_b) as p2,
  row_number() over (
    partition by least(peer_a, peer_b), greatest(peer_a, peer_b)
    order by created_at asc, id asc
  ) as rn
from public.conversations;

update public.messages m
set conversation_id = keep.id
from conversation_dedupe dup
join conversation_dedupe keep
  on keep.p1 = dup.p1 and keep.p2 = dup.p2 and keep.rn = 1
where dup.id = m.conversation_id
  and dup.rn > 1;

delete from public.conversations c
using conversation_dedupe dup
where c.id = dup.id
  and dup.rn > 1;

drop table conversation_dedupe;

create unique index if not exists conversations_peer_pair_key
  on public.conversations (least(peer_a, peer_b), greatest(peer_a, peer_b));
