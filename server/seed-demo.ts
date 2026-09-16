/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

// Additive demo data for judging: GitHub stats, a fuller jude <-> steev chat,
// and a spread of sessions. Unlike server/seed.ts this never resets a table, so
// it is safe to run against a database that already has real accounts in it.
// Session times are relative to the run, so re-run it to refresh the demo.
//
//   npm run db:seed-demo
//
// Logins: test1@college.edu (jude) / test2@college.edu (steev),
// password from TEST_USER_PASSWORD (default PeerSpace-demo-123).

type Supabase = SupabaseClient<any, "public", any>;

function createAdminClient(): Supabase {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function at(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString();
}

// A year of contribution squares with a plausible rhythm: quieter weekends,
// busier term time. Shape matches ContributionWeek[] in src/lib/github.ts.
function buildContributions(seed: number) {
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  let total = 0;
  let random = seed;
  const next = () => {
    random = (random * 1103515245 + 12345) % 2147483648;
    return random / 2147483648;
  };

  const start = new Date(Date.now() - 52 * 7 * DAY);
  for (let week = 0; week < 52; week += 1) {
    const days: Array<{ date: string; count: number }> = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start.getTime() + (week * 7 + day) * DAY);
      const isWeekend = day === 0 || day === 6;
      const roll = next();
      let count = 0;
      if (roll > (isWeekend ? 0.75 : 0.35)) {
        count = Math.floor(next() * (isWeekend ? 4 : 11)) + 1;
      }
      total += count;
      days.push({ date: date.toISOString().slice(0, 10), count });
    }
    weeks.push(days);
  }
  return { weeks, total };
}

const githubProfiles: Record<string, any> = {
  jude: {
    github_username: "jude-builds",
    github_bio: "CS junior. React, Node, and too many side projects.",
    github_avatar_url: "",
    github_repos_count: 24,
    github_top_languages: ["TypeScript", "JavaScript", "Python", "CSS"],
    github_recent_activity: 37
  },
  steev: {
    github_username: "steev-designs",
    github_bio: "Interaction design junior. Design systems and prototyping.",
    github_avatar_url: "",
    github_repos_count: 11,
    github_top_languages: ["CSS", "TypeScript", "Svelte"],
    github_recent_activity: 18
  }
};

const chatScript: Array<{ from: "jude" | "steev"; body: string; minutesAgo: number }> = [
  { from: "steev", body: "hey! saw you know React — I'm trying to learn it properly this term", minutesAgo: 60 * 30 },
  { from: "jude", body: "yeah happy to help. what have you built so far?", minutesAgo: 60 * 29 },
  { from: "steev", body: "mostly Figma prototypes, a couple of static sites. the state stuff is where I get lost", minutesAgo: 60 * 28 },
  { from: "jude", body: "that's the usual wall. useState first, then useEffect, and ignore everything else for a bit", minutesAgo: 60 * 27 },
  { from: "steev", body: "that helps. could you look at my portfolio build sometime?", minutesAgo: 60 * 26 },
  { from: "jude", body: "sure — book a session and I'll walk through it with you", minutesAgo: 60 * 25 },
  { from: "steev", body: "done! also I owe you the Figma systems critique in return", minutesAgo: 60 * 24 },
  { from: "jude", body: "deal. my component naming is a mess so I'll take it", minutesAgo: 60 * 6 },
  { from: "steev", body: "see you then 👋", minutesAgo: 60 * 2 }
];

async function main() {
  const client = createAdminClient();

  const { data: users, error: usersError } = await client
    .from("users")
    .select("id, full_name")
    .in("full_name", ["jude", "steev", "aanya"]);
  if (usersError) throw usersError;

  const idByName = new Map<string, string>(
    (users ?? []).map((user: any) => [user.full_name as string, user.id as string])
  );
  const jude = idByName.get("jude");
  const steev = idByName.get("steev");
  const aanya = idByName.get("aanya");
  if (!jude || !steev) {
    throw new Error("Expected demo accounts 'jude' and 'steev' to exist. Run npm run db:reset-seed first.");
  }

  // 1. GitHub stats, so judges see the card without connecting an account.
  for (const [name, profile] of Object.entries(githubProfiles)) {
    const id = idByName.get(name);
    if (!id) continue;
    const { weeks, total } = buildContributions(name === "jude" ? 7 : 42);
    const { error } = await client
      .from("users")
      .update({
        ...profile,
        github_contributions: weeks,
        github_total_contributions: total
      })
      .eq("id", id);
    if (error) throw error;
    console.log(`GitHub stats set for ${name} (${total} contributions)`);
  }

  // 2. Fill out the jude <-> steev conversation.
  const { data: conversation, error: conversationError } = await client
    .from("conversations")
    .select("id")
    .or(
      `and(peer_a.eq.${jude},peer_b.eq.${steev}),and(peer_a.eq.${steev},peer_b.eq.${jude})`
    )
    .maybeSingle();
  if (conversationError) throw conversationError;

  let conversationId = conversation?.id as string | undefined;
  if (!conversationId) {
    const { data: created, error } = await client
      .from("conversations")
      .insert({ created_by: jude, peer_a: jude, peer_b: steev })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = created.id;
  }

  const { data: existingMessages, error: existingError } = await client
    .from("messages")
    .select("body")
    .eq("conversation_id", conversationId);
  if (existingError) throw existingError;
  const alreadyThere = new Set((existingMessages ?? []).map((row: any) => row.body as string));

  const newMessages = chatScript
    .filter((line) => !alreadyThere.has(line.body))
    .map((line) => ({
      conversation_id: conversationId,
      sender_id: line.from === "jude" ? jude : steev,
      body: line.body,
      created_at: at(-line.minutesAgo * 60 * 1000),
      // Everything except the last couple of lines reads as already seen.
      read_at: line.minutesAgo > 60 * 6 ? at(-line.minutesAgo * 60 * 1000 + 60000) : null
    }));

  if (newMessages.length > 0) {
    const { error } = await client.from("messages").insert(newMessages);
    if (error) throw error;
  }
  console.log(`Chat: added ${newMessages.length} message(s), skipped ${chatScript.length - newMessages.length} already present`);

  // 3. Sessions across every status, timed relative to now.
  const sessions = [
    {
      requester_id: jude,
      peer_id: steev,
      topic: "Portfolio site review",
      scheduled_for: at(2 * HOUR),
      status: "confirmed",
      notes: "Library study room 2. Bring the repo link."
    },
    {
      requester_id: steev,
      peer_id: jude,
      topic: "Figma to React handoff",
      scheduled_for: at(DAY + 3 * HOUR),
      status: "confirmed",
      notes: "Video call — link in chat."
    },
    {
      requester_id: steev,
      peer_id: jude,
      topic: "Component naming critique",
      scheduled_for: at(3 * DAY),
      status: "requested",
      notes: "Design systems clinic, room 204."
    },
    {
      requester_id: jude,
      peer_id: steev,
      topic: "Intro to React hooks",
      scheduled_for: at(-4 * DAY),
      status: "completed",
      notes: "Covered useState and useEffect."
    },
    ...(aanya
      ? [
          {
            requester_id: aanya,
            peer_id: jude,
            topic: "ML study plan",
            scheduled_for: at(2 * DAY + 5 * HOUR),
            status: "requested",
            notes: "Wants help picking a first project."
          }
        ]
      : [])
  ];

  const { data: existingSessions, error: sessionReadError } = await client
    .from("sessions")
    .select("topic");
  if (sessionReadError) throw sessionReadError;
  const existingTopics = new Set((existingSessions ?? []).map((row: any) => row.topic as string));

  const newSessions = sessions.filter((session) => !existingTopics.has(session.topic));
  if (newSessions.length > 0) {
    const { error } = await client.from("sessions").insert(newSessions);
    if (error) throw error;
  }
  console.log(`Sessions: added ${newSessions.length}, skipped ${sessions.length - newSessions.length} already present`);

  console.log("\nDemo data ready. Log in as test1@college.edu (jude) or test2@college.edu (steev).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
