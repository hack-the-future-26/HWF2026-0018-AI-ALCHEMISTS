import { supabase } from "./supabase";

export const LEVEL_TITLES: Record<number, string> = {
  1: "Newcomer",
  2: "Rising Star",
  3: "Trusted Peer",
  4: "Campus Mentor",
  5: "Campus Legend"
};

export function levelLabel(level: number): string {
  return `Level ${level} — ${LEVEL_TITLES[level] ?? LEVEL_TITLES[5]}`;
}

// Mirrors the level thresholds computed server-side in award_peer_coins(),
// so the UI can show the right label even before the next award round-trips.
export function levelForCoins(coins: number): number {
  if (coins >= 2000) return 5;
  if (coins >= 1000) return 4;
  if (coins >= 500) return 3;
  if (coins >= 200) return 2;
  return 1;
}

export type BadgeType =
  | "first_session"
  | "five_star_mentor"
  | "collaborator"
  | "github_pro"
  | "on_a_roll"
  | "campus_legend"
  | "early_adopter";

export type BadgeDefinition = {
  type: BadgeType;
  emoji: string;
  label: string;
  description: string;
  comingSoon?: boolean;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "early_adopter",
    emoji: "🌟",
    label: "Early Adopter",
    description: "Joined PeerSpace during beta"
  },
  {
    type: "first_session",
    emoji: "🎓",
    label: "First Session",
    description: "Complete your first teaching session"
  },
  {
    type: "five_star_mentor",
    emoji: "⭐",
    label: "5-Star Mentor",
    description: "Receive 5 five-star reviews"
  },
  {
    type: "collaborator",
    emoji: "🤝",
    label: "Collaborator",
    description: "Join 3 collaborations"
  },
  {
    type: "github_pro",
    emoji: "🐙",
    label: "GitHub Pro",
    description: "Sync your GitHub profile"
  },
  {
    type: "on_a_roll",
    emoji: "🔥",
    label: "On a Roll",
    description: "7-day streak",
    comingSoon: true
  },
  {
    type: "campus_legend",
    emoji: "🏆",
    label: "Campus Legend",
    description: "Reach Level 5",
    comingSoon: true
  }
];

// Awards coins via the award_peer_coins() RPC so the increment + level
// recalculation happen atomically in the database instead of a client-side
// read-then-write that a second award could race with.
export async function awardCoins(userId: string, amount: number, reason: string) {
  if (!supabase) return;
  console.log(`[rewards] +${amount} PeerCoins to ${userId} (${reason})`);
  const { error } = await supabase.rpc("award_peer_coins", {
    p_user_id: userId,
    p_amount: amount
  });
  if (error) console.error("[rewards] award_peer_coins failed", error);
}

export async function awardBadge(userId: string, badgeType: BadgeType) {
  if (!supabase) return;
  const { error } = await supabase.from("badges").insert({ user_id: userId, badge_type: badgeType });
  // A duplicate award just hits the unique(user_id, badge_type) constraint -
  // that's the desired "only once" behavior, not a failure to surface.
  if (error && error.code !== "23505") console.error("[rewards] awardBadge failed", error);
}

export async function fetchBadges(userId: string): Promise<BadgeType[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("badges").select("badge_type").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.badge_type as BadgeType);
}

export async function fetchBadgeCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("badges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}
