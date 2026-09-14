import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnnouncementStrip } from "./components/layout/AnnouncementStrip";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { GithubSkillsPrompt } from "./components/layout/GithubSkillsPrompt";
import { MobileDrawer } from "./components/layout/MobileDrawer";
import { ProfilePrompt } from "./components/layout/ProfilePrompt";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { navigation } from "./constants/navigation";
import { placeholderOwner } from "./lib/appStorage";
import { fetchGithubImportData } from "./lib/github";
import {
  type CollaborationRow,
  type Conversation,
  type NotificationRow,
  type Peer,
  type PostRow,
  type SessionRow,
  completeSessionRow,
  createCollaborationRow,
  createPostRow,
  fetchCollaborations,
  fetchConversations,
  fetchNotifications,
  fetchPeers,
  fetchPostById,
  fetchProfile,
  fetchSessions,
  findOrCreateConversation,
  incrementSessionsTaught,
  mapUserRowToPeer,
  markConversationRead,
  mergeGithubOfferedSkills,
  saveGithubProfileData,
  sendMessageRow,
  subscribeToMessages,
  subscribeToPosts,
  upsertProfile,
  fetchPosts
} from "./lib/peerspace";
import { awardBadge, awardCoins } from "./lib/rewards";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { CollaborationsPage } from "./pages/CollaborationsPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RewardsPage } from "./pages/RewardsPage";
import { SearchPage } from "./pages/SearchPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import type {
  AuthPhase,
  Collaboration,
  NewCollaborationInput,
  NewPostInput,
  Screen,
  ThemePreference
} from "./types/app";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("loading");
  const [profile, setProfile] = useState<Peer | null>(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [githubSkillsPrompt, setGithubSkillsPrompt] = useState<string[] | null>(null);
  const githubImportedRef = useRef<string | null>(null);
  const [openProfileInEditMode, setOpenProfileInEditMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    try {
      const stored = window.localStorage.getItem("peerspace-theme");
      return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    } catch {
      return "system";
    }
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  const isDarkMode = themePreference === "system" ? systemPrefersDark : themePreference === "dark";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const [pendingSearchQuery, setPendingSearchQuery] = useState<{ query: string; token: number } | null>(
    null
  );

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [collaborationRows, setCollaborationRows] = useState<CollaborationRow[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);
  const [notificationRows, setNotificationRows] = useState<NotificationRow[]>([]);
  const [peersDirectory, setPeersDirectory] = useState<Peer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composerDraft, setComposerDraft] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem("peerspace-theme", themePreference);
    } catch {
      // storage can be unavailable (private browsing) - theme won't persist
    }
  }, [themePreference]);

  // Keep "System" live if the OS theme changes while the app is open.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // Track the Supabase auth session.
  useEffect(() => {
    if (!supabase) {
      setAuthPhase("signedOut");
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load (or clear) the PeerSpace profile whenever the session changes.
  useEffect(() => {
    if (!session) {
      setProfile(null);
      setAuthPhase((prev) => (prev === "loading" ? "signedOut" : "signedOut"));
      setShowProfilePrompt(false);
      setGithubSkillsPrompt(null);
      githubImportedRef.current = null;
      setPosts([]);
      setCollaborationRows([]);
      setSessionRows([]);
      setNotificationRows([]);
      setPeersDirectory([]);
      setConversations([]);
      setSelectedConversationId(null);
      setComposerDraft("");
      setActiveScreen("home");
      return;
    }

    let cancelled = false;
    setAuthPhase("loading");
    const currentSession = session;

    // Fires once per GitHub sign-in: the GitHub access token only ever shows
    // up on the session right after the OAuth redirect (Supabase doesn't
    // persist it across reloads), so this is also how we detect "just signed
    // in with GitHub" versus a normal restored session.
    function maybeImportGithubProfile(hadGithubUsername: boolean) {
      if (!currentSession.provider_token) return;
      if (currentSession.user.app_metadata?.provider !== "github") return;
      if (githubImportedRef.current === currentSession.user.id) return;
      githubImportedRef.current = currentSession.user.id;

      fetchGithubImportData(currentSession.provider_token)
        .then(async (data) => {
          await saveGithubProfileData(currentSession.user.id, {
            username: data.username,
            bio: data.bio,
            avatarUrl: data.avatarUrl,
            reposCount: data.publicRepos,
            topLanguages: data.topLanguages,
            recentActivity: data.recentActivity,
            contributionWeeks: data.contributionWeeks,
            totalContributions: data.totalContributions
          });
          const addedSkills = await mergeGithubOfferedSkills(currentSession.user.id, data.topLanguages);
          if (!hadGithubUsername) {
            await awardCoins(currentSession.user.id, 20, "github_sync");
            await awardBadge(currentSession.user.id, "github_pro");
          }
          if (cancelled) return;
          const refreshedRow = await fetchProfile(currentSession.user.id);
          if (cancelled || !refreshedRow) return;
          setProfile(mapUserRowToPeer(refreshedRow, currentSession.user.email ?? undefined));
          if (addedSkills.length > 0) setGithubSkillsPrompt(addedSkills);
        })
        .catch(() => {
          // Best-effort import: a GitHub sign-in should still land the user
          // in the app even if the GitHub API is unavailable or rate-limited.
        });
    }

    fetchProfile(session.user.id)
      .then(async (row) => {
        if (cancelled) return;
        if (row) {
          setProfile(mapUserRowToPeer(row, session.user.email ?? undefined));
          setAuthPhase("ready");
          maybeImportGithubProfile(Boolean(row.github_username));
          return;
        }

        // No profile row yet - this is the first time this account has a
        // confirmed session. Create a bare-bones profile so the person lands
        // straight in the app instead of being blocked behind a mandatory
        // onboarding form; they can fill in the rest from "My Profile".
        const metadata = session.user.user_metadata ?? {};
        const fallbackName =
          (metadata.full_name as string) ||
          session.user.email?.split("@")[0] ||
          "New member";
        await upsertProfile(session.user.id, {
          fullName: fallbackName,
          college: "",
          major: "",
          academicYear: "",
          bio: ""
        });
        void awardBadge(session.user.id, "early_adopter");
        const created = await fetchProfile(session.user.id);
        if (cancelled) return;
        setProfile(mapUserRowToPeer(created, session.user.email ?? undefined));
        setShowProfilePrompt(true);
        setAuthPhase("ready");
        maybeImportGithubProfile(Boolean(created.github_username));
      })
      .catch(() => {
        if (!cancelled) setAuthPhase("onboarding");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Once the profile is ready, load the directory, conversations, and collaborations.
  useEffect(() => {
    if (authPhase !== "ready" || !profile) return;
    let cancelled = false;

    fetchPeers(profile.id)
      .then((rows) => {
        if (!cancelled) setPeersDirectory(rows);
      })
      .catch(() => {});

    fetchConversations(profile.id)
      .then((rows) => {
        if (!cancelled) setConversations(rows);
      })
      .catch(() => {});

    fetchCollaborations()
      .then((rows) => {
        if (!cancelled) setCollaborationRows(rows);
      })
      .catch(() => {});

    fetchSessions(profile.id)
      .then((rows) => {
        if (!cancelled) setSessionRows(rows);
      })
      .catch(() => {});

    fetchNotifications(profile.id)
      .then((rows) => {
        if (!cancelled) setNotificationRows(rows);
      })
      .catch(() => {});

    fetchPosts()
      .then((rows) => {
        if (!cancelled) setPosts(rows);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // Only re-run when the signed-in user changes, not on every profile edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authPhase, profile?.id]);

  // Live campus feed posts via Supabase Realtime - new posts from any account
  // (including your own, from another tab/device) stream in without a refresh.
  useEffect(() => {
    if (authPhase !== "ready" || !profile || !supabase) return;
    const client = supabase;

    const postsChannel = subscribeToPosts((postId) => {
      fetchPostById(postId)
        .then((post) => {
          if (!post) return;
          setPosts((prev) => (prev.some((existing) => existing.id === post.id) ? prev : [post, ...prev]));
        })
        .catch(() => {});
    });

    return () => {
      if (postsChannel) client.removeChannel(postsChannel);
    };
    // Only re-subscribe when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authPhase, profile?.id]);

  // Live messages + new-conversation notifications via Supabase Realtime.
  useEffect(() => {
    if (authPhase !== "ready" || !profile || !supabase) return;
    const client = supabase;
    const userId = profile.id;

    const messageChannel = subscribeToMessages({
      onInsert: (message) => {
        setConversations((prev) => {
          const index = prev.findIndex((conversation) => conversation.id === message.conversationId);
          if (index === -1) return prev;
          if (prev[index].messages.some((existing) => existing.id === message.id)) return prev;

          const isMine = message.senderId === userId;
          const next = [...prev];
          next[index] = {
            ...prev[index],
            messages: [...prev[index].messages, message],
            // Keep an incoming open-chat message unread until the effect below
            // persists its read receipt. This also covers a just-created chat.
            unread: !isMine ? prev[index].unread + 1 : prev[index].unread
          };
          return next;
        });
      },
      onUpdate: (message) => {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id !== message.conversationId
              ? conversation
              : {
                  ...conversation,
                  messages: conversation.messages.map((existing) =>
                    existing.id === message.id ? message : existing
                  )
                }
          )
        );
      }
    });

    const refreshConversations = () => {
      fetchConversations(userId)
        .then(setConversations)
        .catch(() => {});
    };

    const instanceId = Math.random().toString(36).slice(2);
    const conversationChannelA = client
      .channel(`conversations-a-${userId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `peer_a=eq.${userId}` },
        refreshConversations
      )
      .subscribe();

    const conversationChannelB = client
      .channel(`conversations-b-${userId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `peer_b=eq.${userId}` },
        refreshConversations
      )
      .subscribe();

    return () => {
      // Use removeChannel (not just .unsubscribe()) so React StrictMode's
      // dev-mode double-invoke of this effect can't leave a half-torn-down
      // channel behind that silently stops delivering events.
      if (messageChannel) client.removeChannel(messageChannel);
      client.removeChannel(conversationChannelA);
      client.removeChannel(conversationChannelB);
    };
    // Only re-subscribe when the signed-in user changes, not on every profile edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authPhase, profile?.id]);

  // Mark the open conversation as read (locally and in Supabase).
  useEffect(() => {
    if (authPhase !== "ready" || !profile) return;
    if (activeScreen !== "messages" || !selectedConversationId) return;
    const conversation = conversations.find((item) => item.id === selectedConversationId);
    if (!conversation || !conversation.messages.some((message) => message.senderId !== profile.id && !message.readAt)) return;

    markConversationRead(selectedConversationId, profile.id).catch(() => {});
    setConversations((prev) =>
      prev.map((item) => (item.id === selectedConversationId ? { ...item, unread: 0 } : item))
    );
  }, [activeScreen, selectedConversationId, conversations, authPhase, profile]);

  const collaborations: Collaboration[] = useMemo(() => {
    if (!profile) return [];
    const byId = new Map<string, Peer>([[profile.id, profile]]);
    peersDirectory.forEach((peer) => byId.set(peer.id, peer));
    return collaborationRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      skills: row.skills,
      meetingWindow: row.meetingWindow,
      owner: byId.get(row.ownerId) ?? placeholderOwner(row.ownerId)
    }));
  }, [collaborationRows, profile, peersDirectory]);

  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
  const unreadNotifications = notificationRows.filter(
    (notification) => notification.status === "unread"
  ).length;
  const navItems = navigation.map((item) => {
    if (item.id === "messages") {
      return {
        ...item,
        badge: totalUnread > 0 ? String(totalUnread) : undefined
      };
    }
    if (item.id === "notifications") {
      return {
        ...item,
        badge: unreadNotifications > 0 ? String(unreadNotifications) : undefined
      };
    }
    return item;
  });
  const pageTitle = navigation.find((item) => item.id === activeScreen)?.label ?? "Home";

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  function handleSearchPeople(query: string) {
    setPendingSearchQuery({ query, token: Date.now() });
    setActiveScreen("search");
  }

  async function handleCreatePost(input: NewPostInput) {
    if (!profile) return;
    try {
      const post = await createPostRow(profile.id, input);
      setPosts((prev) => (prev.some((existing) => existing.id === post.id) ? prev : [post, ...prev]));
      void awardCoins(profile.id, 5, "post_created");
    } catch {
      // leave the composer open so the user can retry
    }
  }

  function handleRespondToPost(post: PostRow) {
    if (!profile || post.author.id === profile.id) return;
    void openConversationWith(post.author, `Hi ${post.author.name}, saw your post: "${post.body}" `);
  }

  function handleOpenSessionConversation(session: SessionRow) {
    void openConversationWith(
      session.peer,
      `Hi ${session.peer.name}, following up on our "${session.topic}" session. `
    );
  }

  async function handleCompleteSession(session: SessionRow) {
    if (!profile) return;
    try {
      await completeSessionRow(session.id);
      setSessionRows((prev) =>
        prev.map((row) => (row.id === session.id ? { ...row, status: "completed" } : row))
      );

      const previousSessionsTaught = profile.totalSessionsTaught;
      await incrementSessionsTaught(profile.id, previousSessionsTaught);
      await awardCoins(profile.id, 50, "session_completed");
      if (previousSessionsTaught === 0) {
        await awardBadge(profile.id, "first_session");
      }

      const refreshedRow = await fetchProfile(profile.id);
      if (refreshedRow) setProfile(mapUserRowToPeer(refreshedRow, profile.collegeEmail));
    } catch {
      // leave the session status as-is so the user can retry
    }
  }

  function handleInviteToCollaborate(peer: Peer) {
    void openConversationWith(peer, `Hi ${peer.name}, want to team up on a project together? `);
  }

  function handleScheduleSessionRequest(peer: Peer) {
    void openConversationWith(
      peer,
      `Hi ${peer.name}, could we set up a time to pair on a session? `
    );
  }

  async function handleCreateCollaboration(input: NewCollaborationInput) {
    if (!profile) return;
    try {
      const row = await createCollaborationRow(profile.id, input);
      setCollaborationRows((prev) => [row, ...prev]);
      void awardCoins(profile.id, 30, "collaboration_created");
      const ownedCount = collaborationRows.filter((existing) => existing.ownerId === profile.id).length + 1;
      if (ownedCount >= 3) void awardBadge(profile.id, "collaborator");
    } catch {
      // leave the composer open so the user can retry
    }
  }

  async function openConversationWith(peer: Peer, draftText = "") {
    if (!profile || peer.id === profile.id) return;
    try {
      const conversationId = await findOrCreateConversation(profile.id, peer.id);
      setConversations((prev) =>
        prev.some((conversation) => conversation.id === conversationId)
          ? prev
          : [...prev, { id: conversationId, peer, unread: 0, messages: [] }]
      );
      setComposerDraft(draftText);
      setSelectedConversationId(conversationId);
      setActiveScreen("messages");
    } catch {
      // no-op: leave the user on the current screen if the conversation couldn't be created
    }
  }

  function handleApplyToCollaborate(collab: Collaboration) {
    if (!profile || collab.owner.id === profile.id) return;
    void openConversationWith(
      collab.owner,
      `Hi ${collab.owner.name}, I'd like to apply to collaborate on "${collab.title}". Here's what I can bring: `
    );
  }

  function handleMessagePeer(peer: Peer) {
    void openConversationWith(peer);
  }

  async function handleSendMessage(body: string) {
    const trimmed = body.trim();
    if (!trimmed || !profile || !selectedConversationId) return;
    setComposerDraft("");
    try {
      const message = await sendMessageRow(selectedConversationId, profile.id, trimmed);
      if (!message) return;
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id !== selectedConversationId || conversation.messages.some((item) => item.id === message.id)
            ? conversation
            : { ...conversation, messages: [...conversation.messages, message] }
        )
      );
    } catch {
      setComposerDraft(trimmed);
    }
  }

  if (!hasSupabaseConfig || !supabase) {
    return (
      <div className="landing-shell">
        <div className="landing-card card">
          <h1>Supabase isn&apos;t configured</h1>
          <p>
            Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file, then restart
            the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (authPhase === "loading") {
    return (
      <div className="landing-shell">
        <div className="landing-card card">
          <p>Loading PeerSpace...</p>
        </div>
      </div>
    );
  }

  if (authPhase === "signedOut") {
    if (window.location.pathname !== "/login") {
      window.location.replace("/landing.html");
      return null;
    }
    return <LandingPage />;
  }

  if (authPhase === "onboarding" && session) {
    return (
      <OnboardingPage
        session={session}
        onSaved={(peer) => {
          setProfile(peer);
          setAuthPhase("ready");
        }}
      />
    );
  }

  if (!profile) {
    return (
      <div className="landing-shell">
        <div className="landing-card card">
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeScreen={activeScreen}
        items={navItems}
        profile={profile}
        onNavigate={setActiveScreen}
        onLogout={handleLogout}
      />
      <div className="workspace">
        <TopBar
          pageTitle={pageTitle}
          peerCoins={profile.peerCoins}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setThemePreference(isDarkMode ? "light" : "dark")}
          onSearchPeople={handleSearchPeople}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />
        <AnnouncementStrip />
        {showProfilePrompt && (
          <ProfilePrompt
            onCustomize={() => {
              setActiveScreen("profile");
              setOpenProfileInEditMode(true);
              setShowProfilePrompt(false);
            }}
            onDismiss={() => setShowProfilePrompt(false)}
          />
        )}
        {githubSkillsPrompt && (
          <GithubSkillsPrompt
            skills={githubSkillsPrompt}
            onAccept={() => setGithubSkillsPrompt(null)}
            onEdit={() => {
              setActiveScreen("profile");
              setOpenProfileInEditMode(true);
              setGithubSkillsPrompt(null);
            }}
          />
        )}
        <div className="content-shell">
          <main className="center-column" id="main-content">
            {activeScreen === "home" && (
              <HomePage
                profile={profile}
                posts={posts}
                sessions={sessionRows}
                now={now}
                onNavigate={setActiveScreen}
                onCreatePost={handleCreatePost}
                onRespondToPost={handleRespondToPost}
                onOpenSessionConversation={handleOpenSessionConversation}
              />
            )}
            {activeScreen === "search" && (
              <SearchPage
                profile={profile}
                peers={peersDirectory}
                onMessagePeer={handleMessagePeer}
                onInviteToCollaborate={handleInviteToCollaborate}
                onScheduleSession={handleScheduleSessionRequest}
                pendingSearchQuery={pendingSearchQuery}
              />
            )}
            {activeScreen === "collaborations" && (
              <CollaborationsPage
                profile={profile}
                collaborations={collaborations}
                onCreateCollaboration={handleCreateCollaboration}
                onApplyToCollaborate={handleApplyToCollaborate}
              />
            )}
            {activeScreen === "messages" && (
              <MessagesPage
                currentUserId={profile.id}
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                draft={composerDraft}
                onSelectConversation={setSelectedConversationId}
                onDraftChange={setComposerDraft}
                onSendMessage={handleSendMessage}
              />
            )}
            {activeScreen === "sessions" && (
              <SessionsPage
                sessions={sessionRows}
                onOpenConversation={handleOpenSessionConversation}
                onCompleteSession={handleCompleteSession}
                onNavigate={setActiveScreen}
              />
            )}
            {activeScreen === "notifications" && (
              <NotificationsPage notifications={notificationRows} />
            )}
            {activeScreen === "profile" && (
              <ProfilePage
                profile={profile}
                onProfileSaved={setProfile}
                startInEditMode={openProfileInEditMode}
                onEditModeConsumed={() => setOpenProfileInEditMode(false)}
              />
            )}
            {activeScreen === "rewards" && <RewardsPage profile={profile} />}
            {activeScreen === "settings" && (
              <SettingsPage
                profile={profile}
                themePreference={themePreference}
                onSetThemePreference={setThemePreference}
                onLogout={handleLogout}
              />
            )}
          </main>
          <RightPanel
            activeScreen={activeScreen}
            peers={peersDirectory}
            sessions={sessionRows}
            collaborations={collaborations}
            currentUserId={profile.id}
            onNavigate={setActiveScreen}
            onConnectPeer={handleMessagePeer}
            onOpenSessionConversation={handleOpenSessionConversation}
            onApplyToCollaborate={handleApplyToCollaborate}
          />
        </div>
      </div>
      <BottomTabBar activeScreen={activeScreen} unreadMessages={totalUnread} onNavigate={setActiveScreen} />
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={setActiveScreen}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
