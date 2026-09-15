import {
  Bell,
  CalendarCheck,
  ChatCircle,
  GearSix,
  House,
  MagnifyingGlass,
  Trophy,
  UserCircle,
  UsersThree
} from "@phosphor-icons/react";
import type { NotificationRow, SessionStatus } from "../lib/peerspace";
import type { Screen } from "../types/app";

export type NavItem = {
  id: Screen;
  label: string;
  icon: typeof House;
  badge?: string;
};

export const navigation: NavItem[] = [
  { id: "home", label: "Home", icon: House },
  { id: "search", label: "Find Peers", icon: MagnifyingGlass },
  { id: "collaborations", label: "Collaborations", icon: UsersThree },
  { id: "messages", label: "Messages", icon: ChatCircle },
  { id: "sessions", label: "Sessions", icon: CalendarCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "My Profile", icon: UserCircle },
  { id: "rewards", label: "Rewards", icon: Trophy },
  { id: "settings", label: "Settings", icon: GearSix }
];

export const feedTabs = ["All Feed", "Teammates", "Peer Groups"] as const;

export const postTimeFilters = ["All time", "Today", "This week", "This month"] as const;

export const sessionStatusLabel: Record<SessionStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled"
};

export const notificationKindLabel: Record<NotificationRow["kind"], string> = {
  message: "New message",
  session: "Session update",
  collaboration: "Collaboration match",
  profile_view: "Profile view"
};

export const postCta: Record<string, string> = {
  "Study pod": "Join Session",
  "Peer group": "Collaborate",
  "Teammate ask": "Respond"
};
