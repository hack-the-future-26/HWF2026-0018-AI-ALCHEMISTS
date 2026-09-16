import { ArrowLeft, Checks, MagnifyingGlass, PaperPlaneTilt } from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "../components/ui/Avatar";
import { OverflowMenu } from "../components/ui/OverflowMenu";
import { PageIntro } from "../components/ui/PageIntro";
import type { Conversation, Message } from "../lib/peerspace";

function shortenName(name: string): string {
  if (name.length <= 18) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function lastActivityAt(conversation: Conversation): number {
  const lastMessageAt = conversation.messages.at(-1)?.createdAt;
  return new Date(lastMessageAt ?? conversation.createdAt).getTime();
}

type SearchableConversation = Conversation & { matchedMessage?: Message };

function matchConversation(conversation: Conversation, query: string): SearchableConversation | null {
  if (!query) return conversation;
  const lowerQuery = query.toLowerCase();
  if (conversation.peer.name.toLowerCase().includes(lowerQuery)) return conversation;
  const matchedMessage = conversation.messages
    .slice()
    .reverse()
    .find((message) => message.body.toLowerCase().includes(lowerQuery));
  if (matchedMessage) return { ...conversation, matchedMessage };
  return null;
}

export function MessagesPage({
  currentUserId,
  conversations,
  selectedConversationId,
  drafts,
  error,
  onSelectConversation,
  onDraftChange,
  onSendMessage,
  onDeleteConversation,
  onDismissError
}: {
  currentUserId: string;
  conversations: Conversation[];
  selectedConversationId: string | null;
  drafts: Record<string, string>;
  error: string | null;
  onSelectConversation: (id: string) => void;
  onDraftChange: (conversationId: string, value: string) => void;
  onSendMessage: (conversationId: string, body: string) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onDismissError: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  // Mobile shows either the conversation list or the open chat, never both.
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const orderedConversations = useMemo(
    () => conversations.slice().sort((a, b) => lastActivityAt(b) - lastActivityAt(a)),
    [conversations]
  );

  const visibleConversations = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return orderedConversations as SearchableConversation[];
    return orderedConversations
      .map((conversation) => matchConversation(conversation, trimmedQuery))
      .filter((conversation): conversation is SearchableConversation => conversation !== null);
  }, [orderedConversations, searchQuery]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    orderedConversations[0];

  const draft = selectedConversation ? drafts[selectedConversation.id] ?? "" : "";

  // Opening a chat from elsewhere (a peer card, a toast) selects the
  // conversation in App, so mobile needs to follow it into the chat pane.
  useEffect(() => {
    if (selectedConversationId) setMobileView("chat");
  }, [selectedConversationId]);

  const messageStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = messageStreamRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [selectedConversation?.id, selectedConversation?.messages.length]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedConversation) onSendMessage(selectedConversation.id, draft);
  }

  if (!selectedConversation) {
    return (
      <div className="page-stack">
        <PageIntro
          title="Plan sessions before they become calendar blocks."
          body="Live chat keeps project scope, session notes, and next steps in one place."
        />
        <div className="card">
          <p className="profile-meta">
            No conversations yet. Message a peer from Search or apply to a collaboration to start
            one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Plan sessions before they become calendar blocks."
        body="Live chat keeps project scope, session notes, and next steps in one place."
      />
      <section className="messages-card card" data-mobile-view={mobileView}>
        <aside className="conversation-list">
          <div className="conversation-search">
            <MagnifyingGlass size={15} weight="bold" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search people or messages"
              aria-label="Search conversations"
            />
          </div>
          {visibleConversations.length === 0 && (
            <p className="profile-meta conversation-empty">No conversations match "{searchQuery}".</p>
          )}
          {visibleConversations.map((conversation) => (
            <button
              className={
                conversation.id === selectedConversation.id
                  ? "conversation-row active"
                  : "conversation-row"
              }
              key={conversation.id}
              onClick={() => {
                onSelectConversation(conversation.id);
                setMobileView("chat");
              }}
            >
              <Avatar peer={conversation.peer} />
              <span>
                <strong title={conversation.peer.name}>{shortenName(conversation.peer.name)}</strong>
                <small>
                  {conversation.matchedMessage?.body ??
                    conversation.messages.at(-1)?.body ??
                    "Start the conversation"}
                </small>
              </span>
              {conversation.unread > 0 && <em>{conversation.unread}</em>}
            </button>
          ))}
        </aside>
        <div className="chat-panel">
          <header className="chat-header">
            <button
              className="chat-back"
              type="button"
              onClick={() => setMobileView("list")}
              aria-label="Back to conversations"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
            <Avatar peer={selectedConversation.peer} />
            <div>
              <strong>{selectedConversation.peer.name}</strong>
            </div>
            <OverflowMenu
              label="Conversation options"
              items={[
                {
                  label: "Delete chat",
                  onSelect: () => onDeleteConversation(selectedConversation),
                  danger: true
                }
              ]}
            />
          </header>
          <div className="message-stream" ref={messageStreamRef}>
            {selectedConversation.messages.map((message) => (
              <article
                className={message.senderId === currentUserId ? "bubble mine" : "bubble"}
                key={message.id}
              >
                <p>{message.body}</p>
                <time className="message-meta">
                  {message.time}
                  {message.senderId === currentUserId &&
                    (message.readAt ? (
                      <Checks className="read-receipt read" size={15} weight="bold" aria-label="Seen" />
                    ) : (
                      <Checks className="read-receipt" size={15} weight="bold" aria-label="Sent" />
                    ))}
                </time>
              </article>
            ))}
          </div>
          {error && (
            <div className="message-composer-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={onDismissError}>
                Dismiss
              </button>
            </div>
          )}
          <form className="message-composer" onSubmit={sendMessage}>
            <input
              value={draft}
              onChange={(event) => onDraftChange(selectedConversation.id, event.target.value)}
              placeholder="Write a reply"
            />
            <button className="btn btn-primary" type="submit" aria-label="Send message">
              <PaperPlaneTilt size={17} weight="fill" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
