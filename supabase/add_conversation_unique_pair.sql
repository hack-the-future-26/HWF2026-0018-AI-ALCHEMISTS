-- Apply this once to an existing PeerSpace Supabase database.
-- Prevents duplicate/racing conversation rows for the same pair of peers
-- (order-independent: peer_a/peer_b can be swapped between the two rows).
--
-- Production already has duplicate conversation rows for at least one pair
-- (created by the race this fixes), so this first merges any duplicates
-- into the oldest row per pair before adding the constraint.

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

-- Move messages off duplicate conversations onto the oldest (kept) one.
update public.messages m
set conversation_id = keep.id
from conversation_dedupe dup
join conversation_dedupe keep
  on keep.p1 = dup.p1 and keep.p2 = dup.p2 and keep.rn = 1
where dup.id = m.conversation_id
  and dup.rn > 1;

-- Drop the now-empty duplicate conversation rows.
delete from public.conversations c
using conversation_dedupe dup
where c.id = dup.id
  and dup.rn > 1;

drop table conversation_dedupe;

create unique index if not exists conversations_peer_pair_key
  on public.conversations (least(peer_a, peer_b), greatest(peer_a, peer_b));
