-- Drops the old, out-of-sync app tables (auth.users / your logins are
-- untouched - only the public.* app tables are affected) and rebuilds
-- everything from the current supabase/schema.sql.

drop table if exists
  public.badges,
  public.notifications,
  public.collab_applications,
  public.collaborations,
  public.campus_feed,
  public.reviews,
  public.sessions,
  public.messages,
  public.conversations,
  public.user_skills,
  public.skills,
  public.posts,
  public.users
cascade;

drop type if exists public.skill_type;
drop type if exists public.session_status;
drop type if exists public.collaboration_status;
drop type if exists public.notification_kind;
drop type if exists public.notification_status;

-- ---- everything below is supabase/schema.sql, unchanged ----

create extension if not exists "pgcrypto";

create type public.skill_type as enum ('knows', 'wants');
create type public.session_status as enum ('requested', 'confirmed', 'completed', 'cancelled');
create type public.collaboration_status as enum ('open', 'reviewing', 'closed');
create type public.notification_kind as enum ('message', 'session', 'collaboration', 'profile_view');
create type public.notification_status as enum ('unread', 'read');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  college text not null,
  major text not null,
  academic_year text not null,
  bio text not null default '',
  goals text[] not null default '{}',
  avatar_initials text not null,
  github_username text,
  github_bio text,
  github_avatar_url text,
  github_repos_count integer not null default 0,
  github_top_languages jsonb not null default '[]'::jsonb,
  github_recent_activity integer not null default 0,
  github_contributions jsonb not null default '[]'::jsonb,
  github_total_contributions integer not null default 0,
  peer_coins integer not null default 0,
  level integer not null default 1,
  total_sessions_taught integer not null default 0,
  streak_days integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.user_skills (
  user_id uuid not null references public.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  type public.skill_type not null,
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id, type)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete cascade,
  peer_a uuid not null references public.users(id) on delete cascade,
  peer_b uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_conversation check (peer_a <> peer_b)
);

create unique index conversations_peer_pair_key
  on public.conversations (least(peer_a, peer_b), greatest(peer_a, peer_b));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  peer_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  scheduled_for timestamptz not null,
  status public.session_status not null default 'requested',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_session check (requester_id <> peer_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  reviewee_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now(),
  constraint no_self_review check (reviewer_id <> reviewee_id)
);

create table public.campus_feed (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  title text not null,
  detail text not null,
  kind text not null check (kind in ('member', 'session', 'collaboration')),
  created_at timestamptz not null default now()
);

create table public.collaborations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  title text not null,
  description text not null,
  needed_skills text[] not null default '{}',
  meeting_window text not null default '',
  status public.collaboration_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collab_applications (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (collaboration_id, applicant_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  status public.notification_status not null default 'unread',
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade default auth.uid(),
  tag text not null,
  body text not null,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_type text not null check (badge_type in (
    'first_session',
    'five_star_mentor',
    'collaborator',
    'github_pro',
    'on_a_roll',
    'campus_legend',
    'early_adopter'
  )),
  earned_at timestamptz not null default now(),
  unique (user_id, badge_type)
);

create index user_skills_skill_id_idx on public.user_skills(skill_id);
create index badges_user_id_idx on public.badges(user_id);
create index posts_created_at_idx on public.posts(created_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index sessions_requester_idx on public.sessions(requester_id, scheduled_for);
create index sessions_peer_idx on public.sessions(peer_id, scheduled_for);
create index collaborations_status_idx on public.collaborations(status, created_at desc);
create index collab_applications_collaboration_idx on public.collab_applications(collaboration_id);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create trigger sessions_touch_updated_at
before update on public.sessions
for each row execute function public.touch_updated_at();

create trigger collaborations_touch_updated_at
before update on public.collaborations
for each row execute function public.touch_updated_at();

create or replace function public.is_verified_college_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users auth_user
    where auth_user.id = auth.uid()
      and auth_user.email_confirmed_at is not null
      and (
        lower(auth_user.email) like '%.edu'
        or lower(auth_user.email) like '%.edu.%'
        or lower(auth_user.email) like '%.ac.in'
        or auth_user.raw_app_meta_data->>'provider' = 'github'
      )
  );
$$;

-- Atomically increments peer_coins and recalculates level from the new
-- total, so the client never has to read-then-write a counter that a
-- second award (e.g. two triggers firing close together) could race with.
create or replace function public.award_peer_coins(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_amount <= 0 or not public.is_verified_college_user() then
    return;
  end if;

  update public.users
  set peer_coins = peer_coins + p_amount,
      level = case
        when peer_coins + p_amount >= 2000 then 5
        when peer_coins + p_amount >= 1000 then 4
        when peer_coins + p_amount >= 500 then 3
        when peer_coins + p_amount >= 200 then 2
        else 1
      end
  where id = p_user_id;
end;
$$;

grant execute on function public.award_peer_coins(uuid, integer) to authenticated;

-- RLS policies only filter rows a role is already allowed to touch; PostgREST
-- (and even service_role) still needs baseline table/schema grants first, or
-- every request fails with 42501 permission denied before policies run.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

alter table public.users enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.sessions enable row level security;
alter table public.reviews enable row level security;
alter table public.campus_feed enable row level security;
alter table public.collaborations enable row level security;
alter table public.collab_applications enable row level security;
alter table public.notifications enable row level security;
alter table public.posts enable row level security;
alter table public.badges enable row level security;

create policy "verified users can browse profiles"
on public.users for select
using (public.is_verified_college_user());

create policy "users can insert own profile"
on public.users for insert
with check (id = auth.uid() and public.is_verified_college_user());

create policy "users can update own profile"
on public.users for update
using (id = auth.uid() and public.is_verified_college_user())
with check (id = auth.uid() and public.is_verified_college_user());

create policy "verified users can read skills"
on public.skills for select
using (public.is_verified_college_user());

create policy "verified users can create skills"
on public.skills for insert
with check (public.is_verified_college_user());

create policy "verified users can read user skills"
on public.user_skills for select
using (public.is_verified_college_user());

create policy "users manage own skills"
on public.user_skills for all
using (user_id = auth.uid() and public.is_verified_college_user())
with check (user_id = auth.uid() and public.is_verified_college_user());

create policy "conversation members can read"
on public.conversations for select
using (auth.uid() in (peer_a, peer_b) and public.is_verified_college_user());

create policy "verified users can create conversations"
on public.conversations for insert
with check (
  created_by = auth.uid()
  and auth.uid() in (peer_a, peer_b)
  and public.is_verified_college_user()
);

create policy "conversation members can read messages"
on public.messages for select
using (
  public.is_verified_college_user()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() in (c.peer_a, c.peer_b)
  )
);

create policy "conversation members can send messages"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and public.is_verified_college_user()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and auth.uid() in (c.peer_a, c.peer_b)
  )
);

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

create policy "session members can read"
on public.sessions for select
using (
  auth.uid() in (requester_id, peer_id)
  and public.is_verified_college_user()
);

create policy "verified users can request sessions"
on public.sessions for insert
with check (
  requester_id = auth.uid()
  and public.is_verified_college_user()
);

create policy "session members can update status"
on public.sessions for update
using (
  auth.uid() in (requester_id, peer_id)
  and public.is_verified_college_user()
)
with check (
  auth.uid() in (requester_id, peer_id)
  and public.is_verified_college_user()
);

create policy "verified users can read reviews"
on public.reviews for select
using (public.is_verified_college_user());

create policy "session reviewers can insert"
on public.reviews for insert
with check (
  reviewer_id = auth.uid()
  and public.is_verified_college_user()
  and exists (
    select 1
    from public.sessions s
    where s.id = reviews.session_id
      and s.status = 'completed'
      and auth.uid() in (s.requester_id, s.peer_id)
  )
);

create policy "verified users can read campus feed"
on public.campus_feed for select
using (public.is_verified_college_user());

create policy "verified users can create campus feed items"
on public.campus_feed for insert
with check (actor_id = auth.uid() and public.is_verified_college_user());

create policy "verified users can read collaborations"
on public.collaborations for select
using (public.is_verified_college_user());

create policy "owners can create collaborations"
on public.collaborations for insert
with check (owner_id = auth.uid() and public.is_verified_college_user());

create policy "owners can update collaborations"
on public.collaborations for update
using (owner_id = auth.uid() and public.is_verified_college_user())
with check (owner_id = auth.uid() and public.is_verified_college_user());

create policy "application participants can read"
on public.collab_applications for select
using (
  public.is_verified_college_user()
  and (
    applicant_id = auth.uid()
    or exists (
      select 1
      from public.collaborations c
      where c.id = collab_applications.collaboration_id
        and c.owner_id = auth.uid()
    )
  )
);

create policy "verified users can apply"
on public.collab_applications for insert
with check (
  applicant_id = auth.uid()
  and public.is_verified_college_user()
);

create policy "collab owners can update applications"
on public.collab_applications for update
using (
  public.is_verified_college_user()
  and exists (
    select 1
    from public.collaborations c
    where c.id = collab_applications.collaboration_id
      and c.owner_id = auth.uid()
  )
)
with check (
  public.is_verified_college_user()
  and exists (
    select 1
    from public.collaborations c
    where c.id = collab_applications.collaboration_id
      and c.owner_id = auth.uid()
  )
);

create policy "users read own notifications"
on public.notifications for select
using (user_id = auth.uid() and public.is_verified_college_user());

create policy "users update own notifications"
on public.notifications for update
using (user_id = auth.uid() and public.is_verified_college_user())
with check (user_id = auth.uid() and public.is_verified_college_user());

create policy "verified users can create notifications"
on public.notifications for insert
with check (public.is_verified_college_user());

create policy "verified users can read posts"
on public.posts for select
using (public.is_verified_college_user());

create policy "verified users can create posts"
on public.posts for insert
with check (author_id = auth.uid() and public.is_verified_college_user());

create policy "verified users can read badges"
on public.badges for select
using (public.is_verified_college_user());

create policy "users can insert own badges"
on public.badges for insert
with check (user_id = auth.uid() and public.is_verified_college_user());

alter table public.messages replica identity full;
alter table public.notifications replica identity full;
alter table public.sessions replica identity full;
alter table public.posts replica identity full;
alter table public.collab_applications replica identity full;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.collab_applications;
alter publication supabase_realtime add table public.posts;
