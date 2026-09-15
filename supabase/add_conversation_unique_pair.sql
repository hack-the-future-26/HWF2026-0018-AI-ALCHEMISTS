-- Apply this once to an existing PeerSpace Supabase database.
-- Prevents duplicate/racing conversation rows for the same pair of peers
-- (order-independent: peer_a/peer_b can be swapped between the two rows).
-- If duplicates already exist, keep the oldest row per pair and delete the
-- rest before running this, or the index creation will fail.
create unique index if not exists conversations_peer_pair_key
  on public.conversations (least(peer_a, peer_b), greatest(peer_a, peer_b));
