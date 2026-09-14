export type SkillType = "knows" | "wants";
export type SessionStatus = "requested" | "confirmed" | "completed" | "cancelled";
export type CollaborationStatus = "open" | "reviewing" | "closed";
export type NotificationKind =
  | "message"
  | "session"
  | "collaboration"
  | "profile_view";

export interface SkillTag {
  id: string;
  name: string;
  type: SkillType;
}

export interface Peer {
  id: string;
  name: string;
  major: string;
  year: string;
  college: string;
  initials: string;
  rating: number;
  sessionCount: number;
  goals: string[];
  skills: SkillTag[];
  availability: string;
  bio: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  kind: "member" | "session" | "collaboration";
}

export interface Collaboration {
  id: string;
  title: string;
  owner: string;
  neededSkills: string[];
  status: CollaborationStatus;
  description: string;
  applicants: number;
  meetingWindow: string;
}

export interface Conversation {
  id: string;
  peer: Peer;
  lastMessage: string;
  unread: number;
  messages: Message[];
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  sentAt: string;
}

export interface LearningSession {
  id: string;
  peer: Peer;
  topic: string;
  scheduledFor: string;
  status: SessionStatus;
  notes: string;
}

export interface Review {
  id: string;
  reviewer: string;
  rating: number;
  body: string;
  topic: string;
}

export interface PeerNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface PeerSpaceData {
  currentUser: Peer;
  peers: Peer[];
  activity: ActivityItem[];
  collaborations: Collaboration[];
  conversations: Conversation[];
  sessions: LearningSession[];
  reviews: Review[];
  notifications: PeerNotification[];
}
