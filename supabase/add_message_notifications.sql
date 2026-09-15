-- Run this in the Supabase SQL Editor.
--
-- Creates a notification for the recipient whenever a message is sent.
-- Done as a database trigger (not in the app) so it also works when the
-- recipient is offline, and so the sender never needs permission to write
-- other people's notifications.
--
-- Keeps one unread "message" notification per sender: a second message from
-- the same person refreshes that notification instead of stacking another.
-- The app marks it read when the recipient opens that conversation.
--
-- Safe to re-run.

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  sender_name text;
  notification_title text;
begin
  select case when c.peer_a = new.sender_id then c.peer_b else c.peer_a end
    into recipient_id
    from public.conversations c
   where c.id = new.conversation_id;

  if recipient_id is null or recipient_id = new.sender_id then
    return new;
  end if;

  select full_name into sender_name from public.users where id = new.sender_id;
  notification_title := coalesce(nullif(sender_name, ''), 'Someone') || ' sent you a message';

  update public.notifications
     set title = notification_title,
         body = left(new.body, 140),
         created_at = now()
   where user_id = recipient_id
     and actor_id = new.sender_id
     and kind = 'message'
     and status = 'unread';

  if not found then
    insert into public.notifications (user_id, actor_id, kind, title, body, status)
    values (recipient_id, new.sender_id, 'message', notification_title, left(new.body, 140), 'unread');
  end if;

  return new;
end;
$$;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
after insert on public.messages
for each row execute function public.notify_message_recipient();
