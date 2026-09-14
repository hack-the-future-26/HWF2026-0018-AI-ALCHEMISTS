import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnnouncementStrip } from "./components/layout/AnnouncementStrip";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { GithubSkillsPrompt } from "./components/layout/GithubSkillsPrompt";
import { MobileDrawer } from "./components/layout/MobileDrawer";
import { ProfilePrompt } from "./components/layout/ProfilePrompt";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { MessageToastStack, type MessageToastData } from "./components/ui/MessageToast";
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
  const [messageToasts, setMessageToasts] = useState<MessageToastData[]>([]);

  const selectedConversationIdRef = useRef<string | null>(null);
  const activeScreenRef = useRef<Screen>("home");
  // Kept as a ref so realtime callbacks can read the latest conversations
  // without needing them as effect dependencies.
  const conversationsRef = useRef<Conversation[]>([]);
  // Tracks toast IDs that have already been queued to prevent duplicate toasts.
  const shownToastIds = useRef<Set<string>>(new Set());
  // Tracks conversation IDs that have been locally marked as read but whose
  // DB update (read_at) may not yet be committed. Used to prevent refreshConversations
  // from restoring a stale unread count during the async race window.
  const locallyReadIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);
  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

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

    const messageChannel = subscribeToMessages((message) => {
      // Snapshot these synchronously BEFORE entering any state updater.
      // State updater functions (passed to setState) can be invoked multiple
      // times by React (StrictMode, Concurrent Mode), so side-effects like
      // showing a toast must never live inside them.
      const isMine = message.senderId === userId;
      const openConvId = selectedConversationIdRef.current;
      const currentScreen = activeScreenRef.current;
      const currentConversations = conversationsRef.current;
      const toastId = `${message.id}-toast`;
      const isOpenAndVisible = openConvId === message.conversationId && currentScreen === "messages";

      // Update conversation state (pure updater - no side effects).
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === message.conversationId);
        if (index === -1) return prev;
        // Deduplicate: skip messages already present in state.
        if (prev[index].messages.some((m) => m.id === message.id)) return prev;

        const isOpen = openConvId === prev[index].id;
        const next = [...prev];
        next[index] = {
          ...prev[index],
          messages: [...prev[index].messages, message],
          // Don't increment unread if the conversation is open and visible
          unread: !isMine && !isOpen ? prev[index].unread + 1 : prev[index].unread
        };
        return next;
      });

      // If a message arrives for the currently-open conversation, immediately
      // mark it read in Supabase so the next re-fetch doesn't restore an
      // unread count. Also add to locallyReadIds for race protection.
      if (!isMine && isOpenAndVisible) {
        locallyReadIds.current.add(message.conversationId);
        markConversationRead(message.conversationId, userId).catch(() => {});
      }

      // Show a toast OUTSIDE the updater, with a seen-ID guard to prevent
      // duplicates even if the Supabase channel fires the event more than once.
      if (!isMine && !shownToastIds.current.has(toastId)) {
        if (!isOpenAndVisible) {
          const conv = currentConversations.find((c) => c.id === message.conversationId);
          if (conv) {
            shownToastIds.current.add(toastId);
            setMessageToasts((toasts) => [...toasts, { id: toastId, sender: conv.peer, body: message.body }]);
          }
        }
      }
    });

    const refreshConversations = () => {
      fetchConversations(userId)
        .then((fresh) => {
          // Merge: for any conversation we have already locally marked as read,
          // force unread:0 regardless of what the DB returned. This prevents a
          // race where the re-fetch arrives before Supabase has committed the
          // read_at update, which would restore a stale unread count.
          const merged = fresh.map((conv) =>
            locallyReadIds.current.has(conv.id) ? { ...conv, unread: 0 } : conv
          );
          setConversations(merged);
        })
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
  // Uses locallyReadIds ref to survive the refreshConversations race:
  // once a conversation is added to locallyReadIds, subsequent re-fetches
  // will not restore its unread count even if read_at hasn't committed yet.
  useEffect(() => {
    if (authPhase !== "ready" || !profile) return;
    if (activeScreen !== "messages" || !selectedConversationId) return;

    // Record that this conversation has been read locally so refreshConversations
    // can preserve the cleared state during any async DB race.
    locallyReadIds.current.add(selectedConversationId);

    // Always clear unread in local state immediately.
    setConversations((prev) =>
      prev.map((item) => (item.id === selectedConversationId ? { ...item, unread: 0 } : item))
    );

    // Persist to Supabase (best-effort; failure doesn't break local UI).
    markConversationRead(selectedConversationId, profile.id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, selectedConversationId, authPhase, profile?.id]);

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

  const handleDismissToast = useCallback((toastId: string) => {
    setMessageToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const handleOpenToastConversation = useCallback((senderId: string) => {
    setMessageToasts((prev) => prev.filter((t) => t.sender.id !== senderId));
    const conversation = conversations.find((c) => c.peer.id === senderId);
    if (conversation) {
      setSelectedConversationId(conversation.id);
      setActiveScreen("messages");
    }
  }, [conversations]);

  async function handleSendMessage(body: string) {
    const trimmed = body.trim();
    if (!trimmed || !profile || !selectedConversationId) return;
    setComposerDraft("");
    try {
      await sendMessageRow(selectedConversationId, profile.id, trimmed);
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
      <MessageToastStack
        toasts={messageToasts}
        onDismiss={handleDismissToast}
        onOpen={handleOpenToastConversation}
      />
    </div>
  );
}

export default App;
