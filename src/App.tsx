import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnnouncementStrip } from "./components/layout/AnnouncementStrip";
import { ProfilePrompt } from "./components/layout/ProfilePrompt";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { navigation } from "./constants/navigation";
import { loadMessageNotificationsEnabled, placeholderOwner } from "./lib/appStorage";
import {
  type CollaborationRow,
  type Conversation,
  type NotificationRow,
  type Peer,
  type PostRow,
  type SessionRow,
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
  mapUserRowToPeer,
  markConversationRead,
  sendMessageRow,
  subscribeToMessages,
  subscribeToPosts,
  upsertProfile,
  fetchPosts
} from "./lib/peerspace";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { CollaborationsPage } from "./pages/CollaborationsPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SearchPage } from "./pages/SearchPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { AuthPhase, Collaboration, NewCollaborationInput, NewPostInput, Screen } from "./types/app";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>("loading");
  const [profile, setProfile] = useState<Peer | null>(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [openProfileInEditMode, setOpenProfileInEditMode] = useState(false);
  const [messageNotificationsEnabled, setMessageNotificationsEnabled] = useState(
    loadMessageNotificationsEnabled
  );

  function updateMessageNotificationsEnabled(value: boolean) {
    setMessageNotificationsEnabled(value);
    try {
      window.localStorage.setItem("peerspace-message-notifications", value ? "on" : "off");
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }

  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem("peerspace-theme") === "dark";
    } catch {
      return false;
    }
  });

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

  const selectedConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
    try {
      window.localStorage.setItem("peerspace-theme", isDarkMode ? "dark" : "light");
    } catch {
      // storage can be unavailable (private browsing) - theme just won't persist
    }
  }, [isDarkMode]);

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

    fetchProfile(session.user.id)
      .then(async (row) => {
        if (cancelled) return;
        if (row) {
          setProfile(mapUserRowToPeer(row, session.user.email ?? undefined));
          setAuthPhase("ready");
          return;
        }

        // No profile row yet - this is the first time this account has a
        // confirmed session. Create a bare-bones profile so the person lands
        // straight in the app instead of being blocked behind a mandatory
        // onboarding form; they can fill in the rest from "My Profile".
        const metadata = session.user.user_metadata ?? {};
        const fallbackName =
          (metadata.full_name as string) || session.user.email?.split("@")[0] || "New member";
        await upsertProfile(session.user.id, {
          fullName: fallbackName,
          college: "",
          major: "",
          academicYear: "",
          bio: ""
        });
        const created = await fetchProfile(session.user.id);
        if (cancelled) return;
        setProfile(mapUserRowToPeer(created, session.user.email ?? undefined));
        setShowProfilePrompt(true);
        setAuthPhase("ready");
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
      setConversations((prev) => {
        const index = prev.findIndex((conversation) => conversation.id === message.conversationId);
        if (index === -1) return prev;
        if (prev[index].messages.some((existing) => existing.id === message.id)) return prev;

        const isMine = message.senderId === userId;
        const isOpen = selectedConversationIdRef.current === prev[index].id;
        const next = [...prev];
        next[index] = {
          ...prev[index],
          messages: [...prev[index].messages, message],
          unread: !isMine && !isOpen ? prev[index].unread + 1 : prev[index].unread
        };
        return next;
      });
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
    if (!conversation || conversation.unread === 0) return;

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
  const navItems = navigation.map((item) =>
    item.id === "messages"
      ? {
          ...item,
          badge:
            messageNotificationsEnabled && totalUnread > 0 ? String(totalUnread) : undefined
        }
      : item
  );
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
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((value) => !value)}
          now={now}
          onSearchPeople={handleSearchPeople}
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
        <div className="content-shell">
          <main className="center-column" id="main-content">
            {activeScreen === "home" && (
              <HomePage
                profile={profile}
                posts={posts}
                collaborations={collaborations}
                now={now}
                onNavigate={setActiveScreen}
                onCreatePost={handleCreatePost}
                onApplyToCollaborate={handleApplyToCollaborate}
                onRespondToPost={handleRespondToPost}
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
              <SessionsPage sessions={sessionRows} onOpenConversation={handleOpenSessionConversation} />
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
            {activeScreen === "settings" && (
              <SettingsPage
                profile={profile}
                peers={peersDirectory}
                messageNotificationsEnabled={messageNotificationsEnabled}
                onToggleMessageNotifications={updateMessageNotificationsEnabled}
              />
            )}
          </main>
          <RightPanel
            activeScreen={activeScreen}
            peers={peersDirectory}
            sessions={sessionRows}
            onNavigate={setActiveScreen}
            onConnectPeer={handleMessagePeer}
            onOpenSessionConversation={handleOpenSessionConversation}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
