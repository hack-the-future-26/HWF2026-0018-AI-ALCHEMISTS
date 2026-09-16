import {
  BookOpen,
  CaretDown,
  CheckCircle,
  MagnifyingGlass,
  NotePencil,
  Plus,
  UsersThree
} from "@phosphor-icons/react";
import { useState } from "react";
import { FeedCard } from "../components/cards/FeedCard";
import { PostComposer } from "../components/composers/PostComposer";
import { SectionHeader } from "../components/ui/SectionHeader";
import { UpcomingSessionPill } from "../components/widgets/UpcomingSessionPill";
import { feedTabs, postTimeFilters } from "../constants/navigation";
import { greetingForHour } from "../lib/appStorage";
import type { Peer, PostRow, SessionRow } from "../lib/peerspace";
import type { NewPostInput, Screen } from "../types/app";

// fetchPosts() loads the newest POSTS_PAGE_SIZE posts, so a weekly count that
// uses every loaded post may be an undercount.
const POSTS_PAGE_SIZE = 50;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function countLabel(count: number, isCapped: boolean) {
  return isCapped ? `${count}+` : String(count);
}

// A peer is a match if they want to learn something you know, or know
// something you want to learn - the same rule Find Peers uses.
function isSkillMatch(profile: Peer, peer: Peer) {
  const mine = (type: "knows" | "wants") =>
    new Set(profile.skills.filter((skill) => skill.type === type).map((skill) => skill.name.toLowerCase()));
  const myKnows = mine("knows");
  const myWants = mine("wants");
  return peer.skills.some(
    (skill) =>
      (skill.type === "wants" && myKnows.has(skill.name.toLowerCase())) ||
      (skill.type === "knows" && myWants.has(skill.name.toLowerCase()))
  );
}

export function HomePage({
  profile,
  posts,
  sessions,
  peers,
  openCollaborationCount,
  now,
  onNavigate,
  onCreatePost,
  onRespondToPost,
  onDeletePost
}: {
  profile: Peer;
  posts: PostRow[];
  sessions: SessionRow[];
  peers: Peer[];
  openCollaborationCount: number;
  now: Date;
  onNavigate: (screen: Screen) => void;
  onCreatePost: (input: NewPostInput) => void;
  onRespondToPost: (post: PostRow) => void;
  onDeletePost: (post: PostRow) => void;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSessionPillHidden, setIsSessionPillHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof feedTabs)[number]>("All Feed");
  const [feedQuery, setFeedQuery] = useState("");
  const [activeTimeFilter, setActiveTimeFilter] =
    useState<(typeof postTimeFilters)[number]>("All time");

  const normalizedFeedQuery = feedQuery.trim().toLowerCase();
  const visiblePosts = posts.filter((post) => {
    const matchesTab =
      activeTab === "All Feed" ||
      (activeTab === "Teammates" ? post.tag === "Teammate ask" : post.tag !== "Teammate ask");
    const matchesQuery =
      !normalizedFeedQuery ||
      post.body.toLowerCase().includes(normalizedFeedQuery) ||
      post.tag.toLowerCase().includes(normalizedFeedQuery) ||
      post.skills.some((skill) => skill.toLowerCase().includes(normalizedFeedQuery));
    const matchesTime = isWithinTimeFilter(post.createdAt, activeTimeFilter, now);
    return matchesTab && matchesQuery && matchesTime;
  });

  const postsThisWeek = posts.filter((post) => now.getTime() - new Date(post.createdAt).getTime() <= WEEK_MS);
  const postsCapped = posts.length >= POSTS_PAGE_SIZE && postsThisWeek.length === posts.length;
  const groupPostsThisWeek = postsThisWeek.filter(
    (post) => post.tag === "Peer group" || post.tag === "Study pod"
  ).length;
  const skillMatchCount = peers.filter((peer) => isSkillMatch(profile, peer)).length;

  const stats = [
    { label: "Open collaborations", value: String(openCollaborationCount), icon: BookOpen },
    { label: "Students on PeerSpace", value: String(peers.length + 1), icon: UsersThree },
    { label: "Posts this week", value: countLabel(postsThisWeek.length, postsCapped), icon: NotePencil },
    { label: "Your skill matches", value: String(skillMatchCount), icon: CheckCircle }
  ];

  const upcomingSession = sessions.find(
    (session) =>
      (session.status === "requested" || session.status === "confirmed") &&
      new Date(session.scheduledFor).getTime() >= now.getTime()
  );

  const groupsLabel = countLabel(groupPostsThisWeek, postsCapped);
  const weeklySummary =
    groupPostsThisWeek === 0
      ? "No peer groups or study pods posted this week yet."
      : `${groupsLabel} peer group and study pod ${groupPostsThisWeek === 1 && !postsCapped ? "post" : "posts"} this week.`;

  return (
    <div className="page-stack">
      {upcomingSession && !isSessionPillHidden && (
        <div className="home-mobile-session">
          <UpcomingSessionPill
            session={upcomingSession}
            onOpen={() => onNavigate("sessions")}
            onDismiss={() => setIsSessionPillHidden(true)}
          />
        </div>
      )}
      <section className="home-hero">
        <div>
          <h1>
            {greetingForHour(now.getHours())}, {profile.name}
          </h1>
          <p>{weeklySummary}</p>
        </div>
        <div className="inline-search">
          <label>
            <MagnifyingGlass size={16} />
            <input
              placeholder="Search by skill or topic"
              value={feedQuery}
              onChange={(event) => setFeedQuery(event.target.value)}
            />
          </label>
          <button className="select-button" type="button" onClick={() => onNavigate("search")}>
            Find people
          </button>
        </div>
      </section>

      <section className="stats-row" aria-label="Campus stats">
        {stats.map((stat) => (
          <article className="stat-card card" key={stat.label}>
            <span className="icon-box">
              <stat.icon size={17} />
            </span>
            <div>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <div className="section-row home-feed-header">
        <SectionHeader label="What's happening on campus" />
        <button
          className="btn btn-secondary"
          onClick={() => setIsComposerOpen((open) => !open)}
        >
          <Plus size={14} weight="bold" />
          {isComposerOpen ? "Close" : "New post"}
        </button>
      </div>
      {isComposerOpen && (
        <PostComposer
          onSubmit={(input) => {
            onCreatePost(input);
            setIsComposerOpen(false);
          }}
          onCancel={() => setIsComposerOpen(false)}
        />
      )}
      <div className="section-row feed-controls">
        <div className="tabs" role="tablist" aria-label="Campus feed filters">
          {feedTabs.map((tab) => (
            <button
              className={tab === activeTab ? "tab active" : "tab"}
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="select-button feed-tab-select">
          <select
            aria-label="Filter feed by type"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value as (typeof feedTabs)[number])}
          >
            {feedTabs.map((tab) => (
              <option key={tab} value={tab}>
                {tab}
              </option>
            ))}
          </select>
          <CaretDown size={14} />
        </div>
        <div className="select-button">
          <select
            aria-label="Filter posts by time"
            value={activeTimeFilter}
            onChange={(event) =>
              setActiveTimeFilter(event.target.value as (typeof postTimeFilters)[number])
            }
          >
            {postTimeFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
          <CaretDown size={14} />
        </div>
        <button
          className="btn btn-secondary feed-new-post"
          onClick={() => setIsComposerOpen((open) => !open)}
        >
          <Plus size={14} weight="bold" />
          {isComposerOpen ? "Close" : "New"}
        </button>
      </div>
      <section className="feed-list">
        {visiblePosts.length === 0 && posts.length === 0 && (
          <p className="profile-meta">No posts yet — be the first to share an update.</p>
        )}
        {visiblePosts.length === 0 && posts.length > 0 && (
          <p className="profile-meta">No posts match these filters yet.</p>
        )}
        {visiblePosts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            currentUserId={profile.id}
            onRespond={onRespondToPost}
            onDelete={onDeletePost}
          />
        ))}
      </section>
    </div>
  );
}

function isWithinTimeFilter(
  createdAt: string,
  filter: (typeof postTimeFilters)[number],
  now: Date
) {
  if (filter === "All time") return true;

  const created = new Date(createdAt);
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (filter === "Today") {
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }

  const elapsedMs = now.getTime() - created.getTime();
  if (filter === "This week") return elapsedMs <= 7 * oneDayMs;
  return elapsedMs <= 30 * oneDayMs;
}
