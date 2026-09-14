-- Run in Supabase SQL Editor:
alter table public.users add column if not exists avatar_url text;

-- Optional: only needed if you want real photo uploads to work (the profile
-- picture URL text field works either way, with or without this). Creates a
-- public "avatars" bucket and lets each signed-in user upload/replace only
-- their own file, named "{their user id}.jpg".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);

create policy "users can replace their own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and split_part(name, '.', 1) = auth.uid()::text);
