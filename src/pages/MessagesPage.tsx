import { PaperPlaneTilt } from "@phosphor-icons/react";
import { FormEvent } from "react";
import { Avatar } from "../components/ui/Avatar";
import { PageIntro } from "../components/ui/PageIntro";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import type { Conversation } from "../lib/peerspace";

function shortenName(name: string): string {
  if (name.length <= 18) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function MessagesPage({
  currentUserId,
  conversations,
  selectedConversationId,
  draft,
  onSelectConversation,
  onDraftChange,
  onSendMessage
}: {
  currentUserId: string;
  conversations: Conversation[];
  selectedConversationId: string | null;
  draft: string;
  onSelectConversation: (id: string) => void;
  onDraftChange: (value: string) => void;
  onSendMessage: (body: string) => void;
}) {
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    conversations[0];

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSendMessage(draft);
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
      <section className="messages-card card">
        <aside className="conversation-list">
          {conversations.map((conversation) => (
            <button
              className={
                conversation.id === selectedConversation.id
                  ? "conversation-row active"
                  : "conversation-row"
              }
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <Avatar peer={conversation.peer} />
              <span>
                <strong title={conversation.peer.name}>{shortenName(conversation.peer.name)}</strong>
                <small>{conversation.messages.at(-1)?.body ?? "Start the conversation"}</small>
              </span>
              {conversation.unread > 0 && <em>{conversation.unread}</em>}
            </button>
          ))}
        </aside>
        <div className="chat-panel">
          <header className="chat-header">
            <Avatar peer={selectedConversation.peer} />
            <div>
              <strong>{selectedConversation.peer.name}</strong>
              <span>{selectedConversation.peer.department}</span>
            </div>
            <VerifiedBadge />
          </header>
          <div className="message-stream">
            {selectedConversation.messages.map((message) => (
              <article
                className={message.senderId === currentUserId ? "bubble mine" : "bubble"}
                key={message.id}
              >
                <p>{message.body}</p>
                <time>{message.time}</time>
              </article>
            ))}
          </div>
          <form className="message-composer" onSubmit={sendMessage}>
            <input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Write a reply"
            />
            <button className="btn btn-primary" aria-label="Send message">
              <PaperPlaneTilt size={17} weight="fill" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
