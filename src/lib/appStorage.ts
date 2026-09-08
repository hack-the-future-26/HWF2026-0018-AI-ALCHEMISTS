import type { Peer } from "./peerspace";

export function placeholderOwner(id: string): Peer {
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

export function loadRollNumber(userId: string) {
  try {
    return window.localStorage.getItem(`peerspace-roll-${userId}`) ?? "";
  } catch {
    return "";
  }
}

export function saveRollNumber(userId: string, value: string) {
  try {
    window.localStorage.setItem(`peerspace-roll-${userId}`, value);
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

export function loadSetting(userId: string, key: string, fallback: string) {
  try {
    return window.localStorage.getItem(`peerspace-${key}-${userId}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveSetting(userId: string, key: string, value: string) {
  try {
    window.localStorage.setItem(`peerspace-${key}-${userId}`, value);
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

export function loadMessageNotificationsEnabled() {
  try {
    return window.localStorage.getItem("peerspace-message-notifications") !== "off";
  } catch {
    return true;
  }
}

export function formatClockTime(value: Date) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(value);
}

export function greetingForHour(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}
