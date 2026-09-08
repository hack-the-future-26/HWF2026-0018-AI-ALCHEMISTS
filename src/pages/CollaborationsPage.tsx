import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { CollabCard } from "../components/cards/CollabCard";
import { CollaborationComposer } from "../components/composers/CollaborationComposer";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { Peer } from "../lib/peerspace";
import type { Collaboration, NewCollaborationInput } from "../types/app";

export function CollaborationsPage({
  profile,
  collaborations,
  onCreateCollaboration,
  onApplyToCollaborate
}: {
  profile: Peer;
  collaborations: Collaboration[];
  onCreateCollaboration: (input: NewCollaborationInput) => void;
  onApplyToCollaborate: (collab: Collaboration) => void;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  return (
    <div className="page-stack">
      <PageIntro
        title="Find the teammate your project is missing."
        body="Browse open campus projects by club, lab, skill needs, and meeting rhythm."
      />
      <div className="section-row">
        <SectionHeader label="Open collaborations" />
        <button
          className="btn btn-secondary"
          onClick={() => setIsComposerOpen((open) => !open)}
        >
          <Plus size={14} weight="bold" />
          {isComposerOpen ? "Close" : "New collaboration"}
        </button>
      </div>
      {isComposerOpen && (
        <CollaborationComposer
          onSubmit={(input) => {
            onCreateCollaboration(input);
            setIsComposerOpen(false);
          }}
          onCancel={() => setIsComposerOpen(false)}
        />
      )}
      <section className="collab-grid">
        {collaborations.length === 0 && (
          <p className="profile-meta">No open collaborations yet — post the first one.</p>
        )}
        {collaborations.map((collab) => (
          <CollabCard
            key={collab.id}
            collab={collab}
            currentUserId={profile.id}
            onApply={onApplyToCollaborate}
          />
        ))}
      </section>
    </div>
  );
}
