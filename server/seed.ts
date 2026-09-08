/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import "dotenv/config";

type Supabase = SupabaseClient<any, "public", any>;

const password = process.env.TEST_USER_PASSWORD ?? "PeerSpace-demo-123";

const testUsers = [
  {
    name: "jude",
    email: "test1@college.edu",
    initials: "JU",
    major: "Computer Science",
    year: "Junior",
    knows: ["React", "Node.js"],
    wants: ["Machine Learning"]
  },
  {
    name: "steev",
    email: "test2@college.edu",
    initials: "ST",
    major: "Interaction Design",
    year: "Junior",
    knows: ["UI Design", "Figma"],
    wants: ["React"]
  }
];

const tables = [
  "notifications",
  "collab_applications",
  "collaborations",
  "campus_feed",
  "posts",
  "reviews",
  "sessions",
  "messages",
  "conversations",
  "user_skills",
  "skills",
  "users"
];

const supabase = createAdminClient();

await resetPublicTables(supabase);
const authUsers = await upsertAuthUsers(supabase);
await createProfiles(supabase, authUsers);
await createConversation(supabase, authUsers);
await createCollaborations(supabase, authUsers);
await createSessions(supabase, authUsers);
await createNotifications(supabase, authUsers);
await createPosts(supabase, authUsers);

console.log(
  `Seed complete. Login with test1@college.edu or test2@college.edu using password ${password}.`
);

function createAdminClient(): Supabase {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function resetPublicTables(client: Supabase) {
  for (const table of tables) {
    const { error } = await client.from(table).delete().not("created_at", "is", null);
    if (error) throw new Error(`Could not clear ${table}: ${error.message}`);
    console.log(`Cleared ${table}`);
  }
}

async function upsertAuthUsers(client: Supabase) {
  const { data, error } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) throw error;

  const users: Record<string, User> = {};

  for (const testUser of testUsers) {
    const existing = data.users.find(
      (user) => user.email?.toLowerCase() === testUser.email
    );

    if (existing) {
      const { data: updated, error: updateError } =
        await client.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: testUser.name }
        });

      if (updateError) throw updateError;
      users[testUser.email] = updated.user;
      console.log(`Updated auth user ${testUser.email}`);
      continue;
    }

    const { data: created, error: createError } = await client.auth.admin.createUser({
      email: testUser.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: testUser.name }
    });

    if (createError) throw createError;
    users[testUser.email] = created.user;
    console.log(`Created auth user ${testUser.email}`);
  }

  return users;
}

async function createProfiles(client: Supabase, authUsers: Record<string, User>) {
  const { error: profileError } = await client.from("users").insert(
    testUsers.map((testUser) => ({
      id: authUsers[testUser.email].id,
      full_name: testUser.name,
      college: "PeerSpace College",
      major: testUser.major,
      academic_year: testUser.year,
      bio: `${testUser.name} is testing live peer learning and messaging.`,
      goals: testUser.wants,
      avatar_initials: testUser.initials
    }))
  );

  if (profileError) throw profileError;

  const skillNames = [...new Set(testUsers.flatMap((user) => [...user.knows, ...user.wants]))];
  const { data: skills, error: skillError } = await client
    .from("skills")
    .upsert(
      skillNames.map((name) => ({ name })),
      { onConflict: "name" }
    )
    .select();

  if (skillError) throw skillError;

  const skillByName = new Map((skills ?? []).map((skill) => [skill.name, skill.id]));
  const userSkills = testUsers.flatMap((testUser) => {
    const userId = authUsers[testUser.email].id;

    return [
      ...testUser.knows.map((name) => ({
        user_id: userId,
        skill_id: skillByName.get(name),
        type: "knows"
      })),
      ...testUser.wants.map((name) => ({
        user_id: userId,
        skill_id: skillByName.get(name),
        type: "wants"
      }))
    ];
  });

  const { error: userSkillsError } = await client.from("user_skills").insert(userSkills);
  if (userSkillsError) throw userSkillsError;
}

async function createConversation(client: Supabase, authUsers: Record<string, User>) {
  const jude = authUsers["test1@college.edu"];
  const steev = authUsers["test2@college.edu"];

  const { data, error } = await client
    .from("conversations")
    .insert({ created_by: jude.id, peer_a: jude.id, peer_b: steev.id })
    .select()
    .single();
  if (error) throw error;

  const { error: messageError } = await client.from("messages").insert({
    conversation_id: data.id,
    sender_id: jude.id,
    body: "Hey! Ready for the React API pairing session later?"
  });
  if (messageError) throw messageError;
}

async function createCollaborations(client: Supabase, authUsers: Record<string, User>) {
  const jude = authUsers["test1@college.edu"];
  const steev = authUsers["test2@college.edu"];

  const { error } = await client.from("collaborations").insert([
    {
      owner_id: steev.id,
      title: "Redesign the campus events app",
      description:
        "Looking for a React dev to help ship a cleaner events browsing flow before finals.",
      needed_skills: ["React", "UI Design"],
      meeting_window: "Tuesdays, 5-6 PM",
      status: "open"
    },
    {
      owner_id: jude.id,
      title: "ML study pod for the midterm",
      description:
        "Forming a small group to work through gradient descent and backprop problem sets together.",
      needed_skills: ["Machine Learning"],
      meeting_window: "Sundays, 3 PM",
      status: "open"
    }
  ]);
  if (error) throw new Error(`Could not seed collaborations: ${error.message}`);
}

async function createSessions(client: Supabase, authUsers: Record<string, User>) {
  const jude = authUsers["test1@college.edu"];
  const steev = authUsers["test2@college.edu"];
  const inHours = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { error } = await client.from("sessions").insert([
    {
      requester_id: jude.id,
      peer_id: steev.id,
      topic: "React API pairing",
      scheduled_for: inHours(5),
      status: "confirmed",
      notes: "Studio Lab"
    },
    {
      requester_id: steev.id,
      peer_id: jude.id,
      topic: "Figma systems critique",
      scheduled_for: inHours(72),
      status: "requested",
      notes: "Design Studio"
    }
  ]);
  if (error) throw new Error(`Could not seed sessions: ${error.message}`);
}

async function createNotifications(client: Supabase, authUsers: Record<string, User>) {
  const jude = authUsers["test1@college.edu"];
  const steev = authUsers["test2@college.edu"];

  const { error } = await client.from("notifications").insert([
    {
      user_id: jude.id,
      actor_id: steev.id,
      kind: "session",
      title: "Session confirmed",
      body: "steev confirmed your React API pairing session.",
      status: "unread"
    },
    {
      user_id: steev.id,
      actor_id: jude.id,
      kind: "message",
      title: "New message",
      body: "jude sent you a message.",
      status: "unread"
    },
    {
      user_id: jude.id,
      actor_id: steev.id,
      kind: "collaboration",
      title: "Collaboration match",
      body: "steev is looking for a React dev on the campus events app redesign.",
      status: "unread"
    }
  ]);
  if (error) throw new Error(`Could not seed notifications: ${error.message}`);
}

async function createPosts(client: Supabase, authUsers: Record<string, User>) {
  const jude = authUsers["test1@college.edu"];
  const steev = authUsers["test2@college.edu"];

  const { error } = await client.from("posts").insert([
    {
      author_id: steev.id,
      tag: "Peer group",
      body: "Running a weekly Figma critique room Thursdays at 4 PM — bring a work-in-progress screen and get fast feedback.",
      skills: ["Figma", "UI Design"]
    },
    {
      author_id: jude.id,
      tag: "Teammate ask",
      body: "Building a study-pod matcher for the ML course project. Need someone comfortable with Postgres and a bit of React.",
      skills: ["Postgres", "React"]
    }
  ]);
  if (error) throw new Error(`Could not seed posts: ${error.message}`);
}
