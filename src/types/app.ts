import type { Peer } from "../lib/peerspace";

export type Screen =
  | "home"
  | "search"
  | "collaborations"
  | "messages"
  | "sessions"
  | "notifications"
  | "profile"
  | "settings";

export type AuthPhase = "loading" | "signedOut" | "onboarding" | "ready";

export type Collaboration = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  meetingWindow: string;
  owner: Peer;
};

export type NewPostInput = {
  tag: string;
  body: string;
  skills: string[];
};

export type NewCollaborationInput = {
  title: string;
  description: string;
  skills: string[];
  meetingWindow: string;
};
