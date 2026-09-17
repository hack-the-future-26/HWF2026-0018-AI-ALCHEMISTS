import type { Screen } from "../types/app";

// The app is a single view swapped by state, so without this a reload always
// landed back on Home. Each screen gets a real path (Home is "/"), which also
// makes links like /messages shareable and the browser back button work.
const screenPaths: Record<Screen, string> = {
  home: "/",
  search: "/search",
  collaborations: "/collaborations",
  messages: "/messages",
  sessions: "/sessions",
  notifications: "/notifications",
  profile: "/profile",
  rewards: "/rewards",
  settings: "/settings"
};

const screenByPath = new Map<string, Screen>(
  (Object.entries(screenPaths) as [Screen, string][]).map(([screen, path]) => [path, screen])
);

export function pathForScreen(screen: Screen): string {
  return screenPaths[screen];
}

// Anything unrecognised (including the "/login" callback URL) falls back to
// Home rather than rendering a blank shell.
export function screenFromPath(pathname: string): Screen {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return screenByPath.get(normalized || "/") ?? "home";
}

export function isScreenPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return screenByPath.has(normalized || "/");
}
