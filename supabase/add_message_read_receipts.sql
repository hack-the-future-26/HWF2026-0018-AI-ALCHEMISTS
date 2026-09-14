-- Apply this once to an existing PeerSpace Supabase database.
-- The messages.read_at column already exists in the base schema.
create policy "recipients can mark messages read"
on public.messages for update
using (
  sender_id <> auth.uid()
  and public.is_verified_college_user()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() in (c.peer_a, c.peer_b)
  )
)
with check (
  sender_id <> auth.uid()
  and public.is_verified_college_user()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() in (c.peer_a, c.peer_b)
  )
);
