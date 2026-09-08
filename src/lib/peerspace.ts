import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type SkillType = "knows" | "wants";

export type Peer = {
  id: string;
  name: string;
  department: string;
  year: string;
  building: string;
  initials: string;
  verified: boolean;
  bio: string;
  skills: Array<{ name: string; type: SkillType }>;
  active: string;
  collegeEmail?: string;
};

export type Message = {
  id: string;
  senderId: string;
  body: string;
  time: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  peer: Peer;
  unread: number;
  messages: Message[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export function initialsFor(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "PS";
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(value)
  );
}

export function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function mapUserRowToPeer(row: any, collegeEmail?: string): Peer {
  return {
    id: row.id,
    name: row.full_name,
    department: row.major,
    year: row.academic_year,
    building: row.college,
    initials: row.avatar_initials || initialsFor(row.full_name),
    verified: true,
    bio: row.bio ?? "",
    skills: (row.user_skills ?? [])
      .filter((entry: any) => entry.skills?.name)
      .map((entry: any) => ({ name: entry.skills.name as string, type: entry.type as SkillType })),
    active: "Verified PeerSpace member",
    collegeEmail
  };
}

function placeholderPeer(id: string): Peer {
  return {
    id,
    name: "PeerSpace member",
    department: "",
    year: "",
    building: "",
    initials: "PS",
    verified: false,
    bio: "",
    skills: [],
    active: ""
  };
}

function mapMessageRow(row: any): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    time: formatClock(row.created_at),
    createdAt: row.created_at
  };
}

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function fetchProfile(userId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("users")
    .select("*, user_skills(type, skills(name))")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPeers(excludeId: string): Promise<Peer[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("users")
    .select("*, user_skills(type, skills(name))")
    .neq("id", excludeId)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => mapUserRowToPeer(row));
}

export async function upsertProfile(
  userId: string,
  fields: { fullName: string; college: string; major: string; academicYear: string; bio: string }
) {
  const client = requireClient();
  const { error } = await client.from("users").upsert({
    id: userId,
    full_name: fields.fullName,
    college: fields.college,
    major: fields.major,
    academic_year: fields.academicYear,
    bio: fields.bio,
    avatar_initials: initialsFor(fields.fullName)
  });
  if (error) throw error;
}

export async function syncSkills(userId: string, offered: string[], wanted: string[]) {
  const client = requireClient();
  const names = [...new Set([...offered, ...wanted])];
  let skillByName = new Map<string, string>();

  if (names.length > 0) {
    // Skills only have an insert RLS policy, not update - upsert without
    // ignoreDuplicates resolves to an UPDATE for names that already exist
    // and gets rejected. Insert-or-skip, then select to get every id.
    const { error: upsertError } = await client
      .from("skills")
      .upsert(
        names.map((name) => ({ name })),
        { onConflict: "name", ignoreDuplicates: true }
      );
    if (upsertError) throw upsertError;

    const { data, error } = await client.from("skills").select().in("name", names);
    if (error) throw error;
    skillByName = new Map((data ?? []).map((skill: any) => [skill.name, skill.id]));
  }

  const { error: deleteError } = await client.from("user_skills").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const rows = [
    ...offered.map((name) => ({ user_id: userId, skill_id: skillByName.get(name), type: "knows" })),
    ...wanted.map((name) => ({ user_id: userId, skill_id: skillByName.get(name), type: "wants" }))
  ].filter((row) => row.skill_id);

  if (rows.length > 0) {
    const { error: insertError } = await client.from("user_skills").insert(rows);
    if (insertError) throw insertError;
  }
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const client = requireClient();
  const { data: rows, error } = await client
    .from("conversations")
    .select("*")
    .or(`peer_a.eq.${userId},peer_b.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const conversationRows = rows ?? [];
  const peerIds = [
    ...new Set(
      conversationRows.map((row: any) => (row.peer_a === userId ? row.peer_b : row.peer_a))
    )
  ];

  const peerRows =
    peerIds.length > 0
      ? await client.from("users").select("*, user_skills(type, skills(name))").in("id", peerIds)
      : { data: [], error: null };
  if (peerRows.error) throw peerRows.error;
  const peersById = new Map(
    (peerRows.data ?? []).map((row: any) => [row.id, mapUserRowToPeer(row)])
  );

  const conversationIds = conversationRows.map((row: any) => row.id);
  const messagesResult =
    conversationIds.length > 0
      ? await client
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
  if (messagesResult.error) throw messagesResult.error;

  return conversationRows.map((row: any) => {
    const peerId = row.peer_a === userId ? row.peer_b : row.peer_a;
    const peer = peersById.get(peerId) ?? placeholderPeer(peerId);
    const rowsForConversation = (messagesResult.data ?? []).filter(
      (message: any) => message.conversation_id === row.id
    );
    return {
      id: row.id,
      peer,
      unread: rowsForConversation.filter(
        (message: any) => message.sender_id !== userId && !message.read_at
      ).length,
      messages: rowsForConversation.map(mapMessageRow)
    };
  });
}

export async function findOrCreateConversation(userId: string, peerId: string): Promise<string> {
  const client = requireClient();
  const { data: existing, error } = await client
    .from("conversations")
    .select("*")
    .or(`peer_a.eq.${userId},peer_b.eq.${userId}`);
  if (error) throw error;

  const match = (existing ?? []).find(
    (row: any) =>
      (row.peer_a === userId && row.peer_b === peerId) ||
      (row.peer_b === userId && row.peer_a === peerId)
  );
  if (match) return match.id;

  const { data, error: insertError } = await client
    .from("conversations")
    .insert({ created_by: userId, peer_a: userId, peer_b: peerId })
    .select()
    .single();
  if (insertError) throw insertError;
  return data.id;
}

export async function sendMessageRow(conversationId: string, senderId: string, body: string) {
  const client = requireClient();
  const { error } = await client
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

export async function markConversationRead(conversationId: string, userId: string) {
  if (!supabase) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

export function subscribeToMessages(
  onInsert: (message: Message & { conversationId: string }) => void
): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel(`peerspace-messages-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as any;
        onInsert({ ...mapMessageRow(row), conversationId: row.conversation_id });
      }
    )
    .subscribe();
}

export type CollaborationRow = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  meetingWindow: string;
  ownerId: string;
};

export async function fetchCollaborations(): Promise<CollaborationRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("collaborations")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    skills: row.needed_skills ?? [],
    meetingWindow: row.meeting_window ?? "",
    ownerId: row.owner_id
  }));
}

export async function createCollaborationRow(
  ownerId: string,
  input: { title: string; description: string; skills: string[]; meetingWindow: string }
): Promise<CollaborationRow> {
  const client = requireClient();
  const { data, error } = await client
    .from("collaborations")
    .insert({
      owner_id: ownerId,
      title: input.title,
      description: input.description,
      needed_skills: input.skills,
      meeting_window: input.meetingWindow,
      status: "open"
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    skills: data.needed_skills ?? [],
    meetingWindow: data.meeting_window ?? "",
    ownerId: data.owner_id
  };
}

export type SessionStatus = "requested" | "confirmed" | "completed" | "cancelled";

export type SessionRow = {
  id: string;
  topic: string;
  scheduledFor: string;
  status: SessionStatus;
  notes: string;
  peer: Peer;
};

export async function fetchSessions(userId: string): Promise<SessionRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("sessions")
    .select("*")
    .or(`requester_id.eq.${userId},peer_id.eq.${userId}`)
    .order("scheduled_for", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const peerIds = [
    ...new Set(rows.map((row: any) => (row.requester_id === userId ? row.peer_id : row.requester_id)))
  ];
  const peerRows =
    peerIds.length > 0
      ? await client.from("users").select("*, user_skills(type, skills(name))").in("id", peerIds)
      : { data: [], error: null };
  if (peerRows.error) throw peerRows.error;
  const peersById = new Map(
    (peerRows.data ?? []).map((row: any) => [row.id, mapUserRowToPeer(row)])
  );

  return rows.map((row: any) => {
    const peerId = row.requester_id === userId ? row.peer_id : row.requester_id;
    return {
      id: row.id,
      topic: row.topic,
      scheduledFor: row.scheduled_for,
      status: row.status,
      notes: row.notes ?? "",
      peer: peersById.get(peerId) ?? placeholderPeer(peerId)
    };
  });
}

export type NotificationRow = {
  id: string;
  kind: "message" | "session" | "collaboration" | "profile_view";
  title: string;
  body: string;
  status: "unread" | "read";
  createdAt: string;
};

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.created_at
  }));
}

export type PostRow = {
  id: string;
  tag: string;
  body: string;
  skills: string[];
  createdAt: string;
  author: Peer;
};

function mapPostRow(row: any): PostRow {
  return {
    id: row.id,
    tag: row.tag,
    body: row.body,
    skills: row.skills ?? [],
    createdAt: row.created_at,
    author: row.users ? mapUserRowToPeer(row.users) : placeholderPeer(row.author_id)
  };
}

export async function fetchPosts(): Promise<PostRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("posts")
    .select("*, users(*, user_skills(type, skills(name)))")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapPostRow);
}

export async function fetchPostById(postId: string): Promise<PostRow | null> {
  const client = requireClient();
  const { data, error } = await client
    .from("posts")
    .select("*, users(*, user_skills(type, skills(name)))")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPostRow(data) : null;
}

export async function createPostRow(
  authorId: string,
  input: { tag: string; body: string; skills: string[] }
): Promise<PostRow> {
  const client = requireClient();
  const { data, error } = await client
    .from("posts")
    .insert({ author_id: authorId, tag: input.tag, body: input.body, skills: input.skills })
    .select("*, users(*, user_skills(type, skills(name)))")
    .single();
  if (error) throw error;
  return mapPostRow(data);
}

export function subscribeToPosts(onInsert: (postId: string) => void): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel(`peerspace-posts-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => onInsert(payload.new.id as string)
    )
    .subscribe();
}
