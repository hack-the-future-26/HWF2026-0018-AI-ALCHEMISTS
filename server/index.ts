/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import cors from "cors";
import "dotenv/config";
import express, { Request, Response } from "express";
import { z } from "zod";
import type {
  ActivityItem,
  Collaboration,
  Conversation,
  LearningSession,
  Message,
  Peer,
  PeerNotification,
  PeerSpaceData,
  Review,
  SkillTag,
  SkillType
} from "../src/types";

type Supabase = SupabaseClient<any, "public", any>;

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

const supabaseAdmin = createSupabaseAdmin();
const supabaseClient = createSupabaseClient();

const createCollabSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  neededSkills: z.array(z.string()).min(1),
  meetingWindow: z.string().min(3)
});

const sessionRequestSchema = z.object({
  peerId: z.string().uuid(),
  topic: z.string().min(3),
  scheduledFor: z.string().min(3),
  notes: z.string().optional()
});

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(2000)
});

const conversationSchema = z.object({
  peerId: z.string().uuid()
});

const collabApplicationSchema = z.object({
  note: z.string().max(1000).optional()
});

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    mode: supabaseAdmin && supabaseClient ? "supabase" : "missing-config",
    realtime: ["messages"]
  });
});

app.get("/api/bootstrap", async (request: Request, response: Response) => {
  const auth = await getAuthContext(request, response);
  if (!auth) return;

  const data = await loadPeerSpaceData(auth.client, auth.user);
  if ("error" in data) {
    response.status(500).json({ error: data.error });
    return;
  }

  response.json(data);
});

app.get("/api/directory", async (request: Request, response: Response) => {
  const auth = await getAuthContext(request, response);
  if (!auth) return;

  const query = String(request.query.query ?? "").trim().toLowerCase();
  const skillType = normalizeSkillType(request.query.type);
  const rows = await loadUsers(auth.client);

  if ("error" in rows) {
    response.status(500).json({ error: rows.error });
    return;
  }

  const metrics = await loadProfileMetrics(auth.client);
  if ("error" in metrics) {
    response.status(500).json({ error: metrics.error });
    return;
  }

  const peers = rows
    .filter((row) => row.id !== auth.user.id)
    .map((row) => mapPeer(row, metrics.reviews, metrics.sessions))
    .filter((peer) => {
      const matchesType =
        skillType === "all" || peer.skills.some((skill) => skill.type === skillType);
      const searchable = [
        peer.name,
        peer.major,
        peer.college,
        peer.year,
        peer.bio,
        ...peer.goals,
        ...peer.skills.map((skill) => skill.name)
      ]
        .join(" ")
        .toLowerCase();

      return matchesType && (!query || searchable.includes(query));
    });

  response.json({ peers });
});

app.post("/api/conversations", async (request: Request, response: Response) => {
  const parsed = conversationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const auth = await getAuthContext(request, response);
  if (!auth) return;

  if (parsed.data.peerId === auth.user.id) {
    response.status(400).json({ error: "Choose a different peer." });
    return;
  }

  const { data: existing, error: existingError } = await auth.client
    .from("conversations")
    .select("*")
    .or(`peer_a.eq.${auth.user.id},peer_b.eq.${auth.user.id}`);

  if (existingError) {
    response.status(500).json({ error: existingError.message });
    return;
  }

  const conversation = (existing ?? []).find(
    (item: any) =>
      (item.peer_a === auth.user.id && item.peer_b === parsed.data.peerId) ||
      (item.peer_b === auth.user.id && item.peer_a === parsed.data.peerId)
  );

  if (conversation) {
    response.status(200).json({ conversation });
    return;
  }

  const { data, error } = await auth.client
    .from("conversations")
    .insert({
      created_by: auth.user.id,
      peer_a: auth.user.id,
      peer_b: parsed.data.peerId
    })
    .select()
    .single();

  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.status(201).json({ conversation: data });
});

app.post("/api/collaborations", async (request: Request, response: Response) => {
  const parsed = createCollabSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const auth = await getAuthContext(request, response);
  if (!auth) return;

  const { data, error } = await auth.client
    .from("collaborations")
    .insert({
      owner_id: auth.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      needed_skills: parsed.data.neededSkills,
      meeting_window: parsed.data.meetingWindow,
      status: "open"
    })
    .select()
    .single();

  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.status(201).json({ collaboration: data });
});

app.post(
  "/api/collaborations/:id/apply",
  async (request: Request, response: Response) => {
    const parsed = collabApplicationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const auth = await getAuthContext(request, response);
    if (!auth) return;

    const { data, error } = await auth.client
      .from("collab_applications")
      .insert({
        collaboration_id: request.params.id,
        applicant_id: auth.user.id,
        note: parsed.data.note ?? ""
      })
      .select()
      .single();

    if (error) {
      response.status(500).json({ error: error.message });
      return;
    }

    response.status(201).json({ application: data });
  }
);

app.post("/api/sessions/request", async (request: Request, response: Response) => {
  const parsed = sessionRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const auth = await getAuthContext(request, response);
  if (!auth) return;

  const { data, error } = await auth.client
    .from("sessions")
    .insert({
      requester_id: auth.user.id,
      peer_id: parsed.data.peerId,
      topic: parsed.data.topic,
      scheduled_for: parsed.data.scheduledFor,
      notes: parsed.data.notes ?? "",
      status: "requested"
    })
    .select()
    .single();

  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.status(201).json({ session: data });
});

app.post("/api/messages", async (request: Request, response: Response) => {
  const parsed = messageSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const auth = await getAuthContext(request, response);
  if (!auth) return;

  const { data, error } = await auth.client
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: auth.user.id,
      body: parsed.data.body
    })
    .select()
    .single();

  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.status(201).json({ message: data });
});

app.post("/api/notifications/read", async (request: Request, response: Response) => {
  const auth = await getAuthContext(request, response);
  if (!auth) return;

  const { error } = await auth.client
    .from("notifications")
    .update({ status: "read" })
    .eq("user_id", auth.user.id);

  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.json({ ok: true });
});

app.delete("/api/account", async (request: Request, response: Response) => {
  const auth = await getAuthContext(request, response);
  if (!auth) return;

  if (!supabaseAdmin) {
    response.status(503).json({ error: "Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the API server." });
    return;
  }

  // Deleting the auth user cascades (via `on delete cascade` foreign keys)
  // through public.users and every table that references it.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(auth.user.id);
  if (error) {
    response.status(500).json({ error: error.message });
    return;
  }

  response.json({ ok: true });
});

app.listen(port, () => {
  console.log(`PeerSpace API listening on http://localhost:${port}`);
});

async function loadPeerSpaceData(
  client: Supabase,
  user: User
): Promise<PeerSpaceData | { error: string }> {
  const [usersResult, profileMetrics, activityResult, collaborationsResult] =
    await Promise.all([
      loadUsers(client),
      loadProfileMetrics(client),
      client
        .from("campus_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
      client
        .from("collaborations")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

  if ("error" in usersResult) return usersResult;
  if ("error" in profileMetrics) return profileMetrics;
  if (activityResult.error) return { error: activityResult.error.message };
  if (collaborationsResult.error) return { error: collaborationsResult.error.message };

  const currentUserRow = usersResult.find((row: any) => row.id === user.id);
  if (!currentUserRow) {
    return { error: "No PeerSpace profile exists for this Supabase user." };
  }

  const peersById = new Map(
    usersResult.map((row: any) => [
      row.id,
      mapPeer(row, profileMetrics.reviews, profileMetrics.sessions)
    ])
  );

  const currentUser = peersById.get(user.id) as Peer;
  const peers = [...peersById.values()].filter((peer) => peer.id !== user.id);
  const conversations = await loadConversations(client, user.id, peersById);
  if ("error" in conversations) return conversations;

  const notifications = await loadNotifications(client, user.id);
  if ("error" in notifications) return notifications;

  const collaborations = await mapCollaborations(
    client,
    collaborationsResult.data ?? [],
    peersById
  );
  if ("error" in collaborations) return collaborations;

  return {
    currentUser,
    peers,
    activity: (activityResult.data ?? []).map(mapActivity),
    collaborations,
    conversations,
    sessions: profileMetrics.sessions
      .filter((session: any) => session.requester_id === user.id || session.peer_id === user.id)
      .map((session: any) => mapSession(session, user.id, peersById)),
    reviews: profileMetrics.reviews
      .filter((review: any) => review.reviewee_id === user.id)
      .map((review: any) => mapReview(review, peersById)),
    notifications
  };
}

async function loadUsers(client: Supabase): Promise<any[] | { error: string }> {
  const { data, error } = await client
    .from("users")
    .select("*, user_skills(type, skills(id, name))")
    .order("full_name", { ascending: true });

  if (error) return { error: error.message };
  return data ?? [];
}

async function loadProfileMetrics(
  client: Supabase
): Promise<{ reviews: any[]; sessions: any[] } | { error: string }> {
  const [reviews, sessions] = await Promise.all([
    client.from("reviews").select("*"),
    client.from("sessions").select("*")
  ]);

  if (reviews.error) return { error: reviews.error.message };
  if (sessions.error) return { error: sessions.error.message };

  return {
    reviews: reviews.data ?? [],
    sessions: sessions.data ?? []
  };
}

async function loadConversations(
  client: Supabase,
  userId: string,
  peersById: Map<string, Peer>
): Promise<Conversation[] | { error: string }> {
  const { data: conversationRows, error } = await client
    .from("conversations")
    .select("*")
    .or(`peer_a.eq.${userId},peer_b.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const conversationIds = (conversationRows ?? []).map((item: any) => item.id);
  const messages =
    conversationIds.length > 0
      ? await client
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (messages.error) return { error: messages.error.message };

  return (conversationRows ?? []).map((conversation: any) =>
    mapConversation(
      conversation,
      userId,
      peersById,
      (messages.data ?? []).filter(
        (message: any) => message.conversation_id === conversation.id
      )
    )
  );
}

async function loadNotifications(
  client: Supabase,
  userId: string
): Promise<PeerNotification[] | { error: string }> {
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return (data ?? []).map(mapNotification);
}

async function mapCollaborations(
  client: Supabase,
  rows: any[],
  peersById: Map<string, Peer>
): Promise<Collaboration[] | { error: string }> {
  const adminOrClient = supabaseAdmin ?? client;
  const { data: applications, error } = await adminOrClient
    .from("collab_applications")
    .select("collaboration_id");

  if (error) return { error: error.message };

  return rows.map((row) => {
    const owner = peersById.get(row.owner_id);
    const applicants = (applications ?? []).filter(
      (item: any) => item.collaboration_id === row.id
    ).length;

    return {
      id: row.id,
      title: row.title,
      owner: owner?.name ?? "PeerSpace member",
      neededSkills: row.needed_skills ?? [],
      status: row.status,
      description: row.description,
      applicants,
      meetingWindow: row.meeting_window
    };
  });
}

function mapPeer(row: any, reviews: any[], sessions: any[]): Peer {
  const receivedReviews = reviews.filter((review) => review.reviewee_id === row.id);
  const completedSessions = sessions.filter(
    (session) =>
      session.status === "completed" &&
      (session.requester_id === row.id || session.peer_id === row.id)
  );
  const rating =
    receivedReviews.length > 0
      ? Number(
          (
            receivedReviews.reduce((sum, review) => sum + Number(review.rating), 0) /
            receivedReviews.length
          ).toFixed(1)
        )
      : 0;

  return {
    id: row.id,
    name: row.full_name,
    major: row.major,
    year: row.academic_year,
    college: row.college,
    initials: row.avatar_initials || initialsFor(row.full_name),
    rating,
    sessionCount: completedSessions.length,
    availability: "Available this week",
    bio: row.bio || "Ready to learn with verified classmates.",
    goals: row.goals ?? [],
    skills: mapSkills(row.user_skills ?? [])
  };
}

function mapSkills(rows: any[]): SkillTag[] {
  return rows
    .filter((row) => row.skills?.name)
    .map((row) => ({
      id: row.skills.id,
      name: row.skills.name,
      type: row.type
    }));
}

function mapActivity(row: any): ActivityItem {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    kind: row.kind,
    timestamp: relativeTime(row.created_at)
  };
}

function mapConversation(
  row: any,
  userId: string,
  peersById: Map<string, Peer>,
  messages: any[]
): Conversation {
  const peerId = row.peer_a === userId ? row.peer_b : row.peer_a;
  const peer = peersById.get(peerId) ?? missingPeer(peerId);
  const mappedMessages = messages.map(mapMessage);
  const last = mappedMessages.at(-1);

  return {
    id: row.id,
    peer,
    lastMessage: last?.body ?? "No messages yet",
    unread: messages.filter((message) => message.sender_id !== userId && !message.read_at)
      .length,
    messages: mappedMessages
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    sentAt: formatClock(row.created_at)
  };
}

function mapSession(
  row: any,
  userId: string,
  peersById: Map<string, Peer>
): LearningSession {
  const peerId = row.requester_id === userId ? row.peer_id : row.requester_id;

  return {
    id: row.id,
    peer: peersById.get(peerId) ?? missingPeer(peerId),
    topic: row.topic,
    scheduledFor: formatDate(row.scheduled_for),
    status: row.status,
    notes: row.notes
  };
}

function mapReview(row: any, peersById: Map<string, Peer>): Review {
  return {
    id: row.id,
    reviewer: peersById.get(row.reviewer_id)?.name ?? "PeerSpace member",
    rating: row.rating,
    topic: "Peer session",
    body: row.body
  };
}

function mapNotification(row: any): PeerNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    read: row.status === "read",
    createdAt: relativeTime(row.created_at)
  };
}

function missingPeer(id: string): Peer {
  return {
    id,
    name: "PeerSpace member",
    major: "Student",
    year: "Student",
    college: "College",
    initials: "PS",
    rating: 0,
    sessionCount: 0,
    goals: [],
    skills: [],
    availability: "Available this week",
    bio: ""
  };
}

async function getAuthContext(
  request: Request,
  response: Response
): Promise<{ client: Supabase; user: User } | null> {
  const client = createSupabaseUser(request);
  const token = getBearerToken(request);

  if (!client || !token) {
    response.status(503).json({
      error:
        "Supabase is not configured. Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    });
    return null;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    response.status(401).json({ error: error?.message ?? "Invalid Supabase session." });
    return null;
  }

  return { client, user: data.user };
}

function createSupabaseAdmin(): Supabase | null {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function createSupabaseClient(): Supabase | null {
  const url = supabaseUrl();
  const key = supabasePublishableKey();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function createSupabaseUser(request: Request): Supabase | null {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  const authorization = request.header("Authorization");

  if (!url || !key || !authorization) return null;

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: authorization
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
}

function supabasePublishableKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

function getBearerToken(request: Request) {
  const authorization = request.header("Authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
}

function normalizeSkillType(value: unknown): SkillType | "all" {
  if (value === "knows" || value === "wants") return value;
  return "all";
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(elapsed / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
