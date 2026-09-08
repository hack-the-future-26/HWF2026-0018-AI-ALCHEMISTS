import { CaretDown, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { CollabCard } from "../components/cards/CollabCard";
import { FeedCard } from "../components/cards/FeedCard";
import { PostComposer } from "../components/composers/PostComposer";
import { SectionHeader } from "../components/ui/SectionHeader";
import { feedTabs, stats } from "../constants/navigation";
import { greetingForHour } from "../lib/appStorage";
import type { Peer, PostRow } from "../lib/peerspace";
import type { Collaboration, NewPostInput, Screen } from "../types/app";

export function HomePage({
  profile,
  posts,
  collaborations,
  now,
  onNavigate,
  onCreatePost,
  onApplyToCollaborate,
  onRespondToPost
}: {
  profile: Peer;
  posts: PostRow[];
  collaborations: Collaboration[];
  now: Date;
  onNavigate: (screen: Screen) => void;
  onCreatePost: (input: NewPostInput) => void;
  onApplyToCollaborate: (collab: Collaboration) => void;
  onRespondToPost: (post: PostRow) => void;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof feedTabs)[number]>("All Feed");
  const [feedQuery, setFeedQuery] = useState("");

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
    return matchesTab && matchesQuery;
  });

  return (
    <div className="page-stack">
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
              placeholder="Search posts by skill or keyword"
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
      <section className="feed-list">
        {visiblePosts.length === 0 && posts.length === 0 && (
          <p className="profile-meta">No posts yet — be the first to share an update.</p>
        )}
        {visiblePosts.length === 0 && posts.length > 0 && (
          <p className="profile-meta">No posts match "{feedQuery}" yet.</p>
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

      <SectionHeader label="Looking for teammates" />
      <section className="collab-grid">
        {collaborations.length === 0 && (
          <p className="profile-meta">No open collaborations yet.</p>
        )}
        {collaborations.slice(0, 2).map((collab) => (
          <CollabCard
            key={collab.id}
            collab={collab}
            compact
            currentUserId={profile.id}
            onApply={onApplyToCollaborate}
          />
        ))}
      </section>
    </div>
  );
}
