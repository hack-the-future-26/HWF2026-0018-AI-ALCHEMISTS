import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { GithubSkillsPrompt } from "./components/layout/GithubSkillsPrompt";
import { MobileDrawer } from "./components/layout/MobileDrawer";
import { ProfilePrompt } from "./components/layout/ProfilePrompt";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { BackToTopButton } from "./components/ui/BackToTopButton";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { ScheduleSessionModal } from "./components/layout/ScheduleSessionModal";
import type { ScheduleSessionInput } from "./components/composers/ScheduleSessionForm";
import { MessageToastStack, type MessageToastData } from "./components/ui/MessageToast";
import { SessionReminderToastStack, type SessionReminderToastData } from "./components/ui/SessionReminderToast";
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
  setSessionStatus,
  subscribeToSessions,
  clearConversationForMe,
  deletePostRow,
  createCollaborationRow,
  createPostRow,
  deleteAccount,
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
  markMessageNotificationsRead,
  mergeGithubOfferedSkills,
  requestSessionRow,
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

const SESSION_REMINDER_KEY = "peerspace-session-reminders";

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
  // Keyed by conversation id so each DM keeps its own unsent draft.
  const [composerDrafts, setComposerDrafts] = useState<Record<string, string>>({});
  const setComposerDraft = useCallback((conversationId: string, value: string) => {
    setComposerDrafts((prev) => ({ ...prev, [conversationId]: value }));
  }, []);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageToasts, setMessageToasts] = useState<MessageToastData[]>([]);
  const [pendingDelete, setPendingDelete] = useState<
    { kind: "post"; post: PostRow } | { kind: "conversation"; conversation: Conversation } | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [schedulingPeer, setSchedulingPeer] = useState<Peer | null>(null);
  const [isSchedulingSession, setIsSchedulingSession] = useState(false);
  const [sessionReminderToasts, setSessionReminderToasts] = useState<SessionReminderToastData[]>([]);

  const selectedConversationIdRef = useRef<string | null>(null);
  const activeScreenRef = useRef<Screen>("home");
  const conversationsRef = useRef<Conversation[]>([]);
  const shownToastIds = useRef<Set<string>>(new Set());
  const locallyReadIds = useRef<Set<string>>(new Set());
  // Persisted so a reload inside the reminder window doesn't re-alert.
  const shownSessionReminderIds = useRef<Set<string>>(
    new Set(
      (() => {
        try {
          return JSON.parse(window.localStorage.getItem(SESSION_REMINDER_KEY) ?? "[]") as string[];
        } catch {
          return [];
        }
      })()
    )
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(timer);
  }, [actionError]);
  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  // Reveals the new theme as a circle growing out of the click point. Falls
  // back to a color crossfade where View Transitions aren't supported, and
  // switches instantly for users who ask for reduced motion.
  const changeTheme = useCallback(
    (next: ThemePreference, origin?: { x: number; y: number }) => {
      const root = document.documentElement;
      const nextIsDark = next === "system" ? systemPrefersDark : next === "dark";
      if (nextIsDark === isDarkMode) {
        setThemePreference(next);
        return;
      }

      const applyTheme = () => {
        // The view transition snapshots the DOM right after this callback,
        // so the new theme has to be on the page synchronously - not in the
        // useEffect above, which runs later.
        flushSync(() => setThemePreference(next));
        root.dataset.theme = nextIsDark ? "dark" : "light";
      };

      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        applyTheme();
        return;
      }

      if (typeof document.startViewTransition !== "function") {
        root.classList.add("theme-transition");
        applyTheme();
        window.setTimeout(() => root.classList.remove("theme-transition"), 400);
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 0;
      const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      document
        .startViewTransition(applyTheme)
        .ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
            {
              duration: 550,
              easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              pseudoElement: "::view-transition-new(root)"
            }
          );
        })
        .catch(() => {
          // Transition was skipped (e.g. tab hidden) - the theme still applied.
        });
    },
    [isDarkMode, systemPrefersDark]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem("peerspace-theme", themePreference);
    } catch {
      // storage can be unavailable (private browsing) - theme won't persist
    }
  }, [themePreference]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

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
      setComposerDrafts({});
      setActiveScreen("home");
      return;
    }

    let cancelled = false;
    setAuthPhase("loading");
    const currentSession = session;

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
        .catch((error) => {
          console.error("GitHub profile import failed:", error);
          githubImportedRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authPhase, profile?.id]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authPhase, profile?.id]);

  useEffect(() => {
    if (authPhase !== "ready" || !profile || !supabase) return;
    const client = supabase;
    const userId = profile.id;

    const messageChannel = subscribeToMessages({
      onInsert: (message) => {
        const isMine = message.senderId === userId;
        const openConvId = selectedConversationIdRef.current;
        const currentScreen = activeScreenRef.current;
        const currentConversations = conversationsRef.current;
        const toastId = `${message.id}-toast`;
        const isOpenAndVisible = openConvId === message.conversationId && currentScreen === "messages";

        // Not in local state means this user cleared the chat, so refetch to
        // bring it back with just the messages sent since the cutoff.
        if (!currentConversations.some((c) => c.id === message.conversationId)) {
          fetchConversations(userId)
            .then(setConversations)
            .catch(() => {});
        }

        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === message.conversationId);
          if (index === -1) return prev;
          if (prev[index].messages.some((m) => m.id === message.id)) return prev;

          const isOpen = openConvId === prev[index].id;
          const next = [...prev];
          next[index] = {
            ...prev[index],
            messages: [...prev[index].messages, message],
            unread: !isMine && !isOpen ? prev[index].unread + 1 : prev[index].unread
          };
          return next;
        });

        if (!isMine && isOpenAndVisible) {
          locallyReadIds.current.add(message.conversationId);
          markConversationRead(message.conversationId, userId).catch(() => {});
        }

        // The database trigger has already created/refreshed the recipient's
        // notification by the time this event arrives. If the chat is open,
        // it's already seen, so clear it before reloading the list.
        if (!isMine) {
          const refreshNotifications = () =>
            fetchNotifications(userId)
              .then(setNotificationRows)
              .catch(() => {});
          if (isOpenAndVisible) {
            markMessageNotificationsRead(userId, message.senderId)
              .catch(() => {})
              .finally(refreshNotifications);
          } else {
            refreshNotifications();
          }
        }

        if (!isMine && !shownToastIds.current.has(toastId)) {
          if (!isOpenAndVisible) {
            const conv = currentConversations.find((c) => c.id === message.conversationId);
            if (conv) {
              shownToastIds.current.add(toastId);
              setMessageToasts((toasts) => [...toasts, { id: toastId, sender: conv.peer, body: message.body }]);
            }
          }
        }
      },
      onUpdate: (message) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === message.conversationId);
          if (index === -1) return prev;
          const messageIndex = prev[index].messages.findIndex((m) => m.id === message.id);
          if (messageIndex === -1) return prev;

          const nextMessages = [...prev[index].messages];
          nextMessages[messageIndex] = { ...nextMessages[messageIndex], readAt: message.readAt };
          const next = [...prev];
          next[index] = { ...prev[index], messages: nextMessages };
          return next;
        });
      }
    });

    const refreshConversations = () => {
      fetchConversations(userId)
        .then((fresh) => {
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

    // Without this a session someone books with you (or confirms) stays
    // invisible until a reload, so its reminder never fires either.
    const sessionChannel = subscribeToSessions(userId, () => {
      fetchSessions(userId)
        .then(setSessionRows)
        .catch(() => {});
    });

    return () => {
      if (messageChannel) client.removeChannel(messageChannel);
      client.removeChannel(conversationChannelA);
      client.removeChannel(conversationChannelB);
      if (sessionChannel) client.removeChannel(sessionChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authPhase, profile?.id]);

  useEffect(() => {
    if (authPhase !== "ready" || !profile) return;
    if (activeScreen !== "messages" || !selectedConversationId) return;

    locallyReadIds.current.add(selectedConversationId);

    setConversations((prev) =>
      prev.map((item) => (item.id === selectedConversationId ? { ...item, unread: 0 } : item))
    );

    markConversationRead(selectedConversationId, profile.id).catch(() => {});

    const peerId = conversationsRef.current.find((item) => item.id === selectedConversationId)?.peer.id;
    if (peerId) {
      setNotificationRows((prev) =>
        prev.map((notification) =>
          notification.kind === "message" && notification.actorId === peerId && notification.status === "unread"
            ? { ...notification, status: "read" }
            : notification
        )
      );
      markMessageNotificationsRead(profile.id, peerId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, selectedConversationId, authPhase, profile?.id]);

  // New sign-ups and notifications created while the tab was in the
  // background show up as soon as the user comes back to it.
  const profileId = profile?.id;
  useEffect(() => {
    if (authPhase !== "ready" || !profileId) return;
    const userId = profileId;
    function handleFocus() {
      fetchPeers(userId).then(setPeersDirectory).catch(() => {});
      fetchNotifications(userId).then(setNotificationRows).catch(() => {});
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [authPhase, profileId]);

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

  async function handleDeleteAccount() {
    await deleteAccount();
    // The account no longer exists server-side, so only clear the local session.
    await supabase?.auth.signOut({ scope: "local" });
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

  async function handleConfirmSession(session: SessionRow) {
    try {
      await setSessionStatus(session.id, "confirmed");
      setSessionRows((prev) =>
        prev.map((row) => (row.id === session.id ? { ...row, status: "confirmed" } : row))
      );
    } catch {
      setActionError("Couldn't confirm that session. Please try again.");
    }
  }

  async function handleDeclineSession(session: SessionRow) {
    try {
      await setSessionStatus(session.id, "cancelled");
      setSessionRows((prev) =>
        prev.map((row) => (row.id === session.id ? { ...row, status: "cancelled" } : row))
      );
    } catch {
      setActionError("Couldn't decline that session. Please try again.");
    }
  }

  async function handleCompleteSession(session: SessionRow) {
    if (!profile) return;
    try {
      await setSessionStatus(session.id, "completed");
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
    setSchedulingPeer(peer);
  }

  async function handleSubmitSessionRequest(input: ScheduleSessionInput) {
    if (!schedulingPeer) return;
    setIsSchedulingSession(true);
    try {
      const session = await requestSessionRow(schedulingPeer.id, schedulingPeer, input);
      setSessionRows((prev) =>
        [...prev, session].sort(
          (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
        )
      );
      setSchedulingPeer(null);
    } catch {
      setActionError(`Couldn't schedule a session with ${schedulingPeer.name}. Please try again.`);
    } finally {
      setIsSchedulingSession(false);
    }
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
          : [
              ...prev,
              {
                id: conversationId,
                peer,
                unread: 0,
                messages: [],
                createdAt: new Date().toISOString()
              }
            ]
      );
      setSendError(null);
      if (draftText) setComposerDraft(conversationId, draftText);
      setSelectedConversationId(conversationId);
      setActiveScreen("messages");
    } catch {
      setActionError(`Couldn't start a conversation with ${peer.name}. Please try again.`);
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

  const handleDismissSessionReminder = useCallback((toastId: string) => {
    setSessionReminderToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const handleOpenSessionReminder = useCallback(() => {
    setActiveScreen("sessions");
  }, []);

  useEffect(() => {
    const REMINDER_WINDOW_MS = 10 * 60 * 1000;
    const upcoming = sessionRows.filter((row) => {
      if (row.status !== "requested" && row.status !== "confirmed") return false;
      if (shownSessionReminderIds.current.has(row.id)) return false;
      const msUntil = new Date(row.scheduledFor).getTime() - now.getTime();
      return msUntil >= 0 && msUntil <= REMINDER_WINDOW_MS;
    });
    if (upcoming.length === 0) return;

    upcoming.forEach((session) => shownSessionReminderIds.current.add(session.id));
    try {
      window.localStorage.setItem(
        SESSION_REMINDER_KEY,
        JSON.stringify([...shownSessionReminderIds.current])
      );
    } catch {
      // a full or unavailable localStorage shouldn't block the reminder itself
    }

    setSessionReminderToasts((prev) => [
      ...prev,
      ...upcoming.map((session) => ({
        id: session.id,
        peer: session.peer,
        topic: session.topic,
        minutesUntil: Math.max(
          0,
          Math.round((new Date(session.scheduledFor).getTime() - now.getTime()) / 60000)
        )
      }))
    ]);

    if (typeof window !== "undefined" && "Notification" in window) {
      const notify = () => {
        upcoming.forEach((session) => {
          const minutesUntil = Math.max(
            0,
            Math.round((new Date(session.scheduledFor).getTime() - now.getTime()) / 60000)
          );
          new Notification(`Session with ${session.peer.name}`, {
            body: `${session.topic} — starts in ${minutesUntil} min`
          });
        });
      };
      if (Notification.permission === "granted") {
        notify();
      } else if (Notification.permission === "default") {
        void Notification.requestPermission().then((permission) => {
          if (permission === "granted") notify();
        });
      }
    }
  }, [now, sessionRows]);

  // The conversation id comes from whichever chat is actually on screen, which
  // isn't always selectedConversationId - MessagesPage falls back to the most
  // recent conversation when nothing has been clicked yet.
  async function handleSendMessage(conversationId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed || !profile) return;
    setComposerDraft(conversationId, "");
    setSendError(null);
    try {
      const message = await sendMessageRow(conversationId, profile.id, trimmed);
      if (!message) return;
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id !== conversationId || conversation.messages.some((item) => item.id === message.id)
            ? conversation
            : { ...conversation, messages: [...conversation.messages, message] }
        )
      );
    } catch {
      setComposerDraft(conversationId, trimmed);
      setSendError("Message didn't send. Please try again.");
    }
  }

  const handleDismissSendError = useCallback(() => setSendError(null), []);

  async function handleConfirmDelete() {
    if (!pendingDelete || !profile) return;
    setIsDeleting(true);
    try {
      if (pendingDelete.kind === "post") {
        await deletePostRow(pendingDelete.post.id);
        setPosts((prev) => prev.filter((post) => post.id !== pendingDelete.post.id));
      } else {
        const { id } = pendingDelete.conversation;
        await clearConversationForMe(id, profile.id);
        setConversations((prev) => prev.filter((conversation) => conversation.id !== id));
        setComposerDrafts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (selectedConversationId === id) setSelectedConversationId(null);
      }
      setPendingDelete(null);
    } catch {
      setActionError(
        pendingDelete.kind === "post"
          ? "Couldn't delete that post. Please try again."
          : "Couldn't delete that chat. Please try again."
      );
    } finally {
      setIsDeleting(false);
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
          onToggleDarkMode={(origin) => changeTheme(isDarkMode ? "light" : "dark", origin)}
          onSearchPeople={handleSearchPeople}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />
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
        {pendingDelete && (
          <ConfirmDialog
            title={pendingDelete.kind === "post" ? "Delete this post?" : "Delete this chat?"}
            body={
              pendingDelete.kind === "post"
                ? "This removes the post for everyone on the feed. It can't be undone."
                : `This clears the chat with ${pendingDelete.conversation.peer.name} for you only — they keep their copy. It reappears if they message you again.`
            }
            confirmLabel={pendingDelete.kind === "post" ? "Delete post" : "Delete chat"}
            isBusy={isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        )}
        {schedulingPeer && (
          <ScheduleSessionModal
            peer={schedulingPeer}
            isSubmitting={isSchedulingSession}
            onSubmit={handleSubmitSessionRequest}
            onCancel={() => setSchedulingPeer(null)}
          />
        )}
        <div className="content-shell">
          <main className="center-column" id="main-content">
            {activeScreen === "home" && (
              <HomePage
                profile={profile}
                posts={posts}
                sessions={sessionRows}
                peers={peersDirectory}
                openCollaborationCount={collaborations.length}
                now={now}
                onNavigate={setActiveScreen}
                onCreatePost={handleCreatePost}
                onRespondToPost={handleRespondToPost}
                onDeletePost={(post) => setPendingDelete({ kind: "post", post })}
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
                drafts={composerDrafts}
                error={sendError}
                onSelectConversation={setSelectedConversationId}
                onDraftChange={setComposerDraft}
                onSendMessage={handleSendMessage}
                onDeleteConversation={(conversation) =>
                  setPendingDelete({ kind: "conversation", conversation })
                }
                onDismissError={handleDismissSendError}
              />
            )}
            {activeScreen === "sessions" && (
              <SessionsPage
                sessions={sessionRows}
                currentUserId={profile.id}
                onOpenConversation={handleOpenSessionConversation}
                onCompleteSession={handleCompleteSession}
                onConfirmSession={handleConfirmSession}
                onDeclineSession={handleDeclineSession}
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
                onSetThemePreference={changeTheme}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
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
      <BottomTabBar activeScreen={activeScreen} unreadMessages={totalUnread} onNavigate={setActiveScreen} />
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={setActiveScreen}
        onLogout={handleLogout}
      />
      <BackToTopButton />
      <div className="toast-layer">
        <SessionReminderToastStack
          toasts={sessionReminderToasts}
          onDismiss={handleDismissSessionReminder}
          onOpen={handleOpenSessionReminder}
        />
        <MessageToastStack
          toasts={messageToasts}
          onDismiss={handleDismissToast}
          onOpen={handleOpenToastConversation}
        />
        {actionError && (
          <div className="message-toast-stack" aria-live="assertive">
            <div className="message-composer-error action-error-toast" role="alert">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;