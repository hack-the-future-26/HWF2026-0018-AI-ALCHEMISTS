import { CaretDown, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { FeedCard } from "../components/cards/FeedCard";
import { PostComposer } from "../components/composers/PostComposer";
import { SectionHeader } from "../components/ui/SectionHeader";
import { UpcomingSessionWidget } from "../components/widgets/UpcomingSessionWidget";
import { feedTabs, postTimeFilters, stats } from "../constants/navigation";
import { greetingForHour } from "../lib/appStorage";
import type { Peer, PostRow, SessionRow } from "../lib/peerspace";
import type { NewPostInput, Screen } from "../types/app";

export function HomePage({
  profile,
  posts,
  sessions,
  now,
  onNavigate,
  onCreatePost,
  onRespondToPost,
  onOpenSessionConversation
}: {
  profile: Peer;
  posts: PostRow[];
  sessions: SessionRow[];
  now: Date;
  onNavigate: (screen: Screen) => void;
  onCreatePost: (input: NewPostInput) => void;
  onRespondToPost: (post: PostRow) => void;
  onOpenSessionConversation: (session: SessionRow) => void;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
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

  return (
    <div className="page-stack">
      <div className="home-mobile-session">
        <UpcomingSessionWidget
          sessions={sessions}
          onNavigate={onNavigate}
          onOpenSessionConversation={onOpenSessionConversation}
        />
      </div>
      <section className="home-hero">
        <div>
          <h1>
            {greetingForHour(now.getHours())}, {profile.name}
          </h1>
          <p>PeerSpace College has 8 active study groups this week.</p>
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
            <CaretDown size={14} />
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

      <div className="section-row">
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
      <div className="section-row">
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
