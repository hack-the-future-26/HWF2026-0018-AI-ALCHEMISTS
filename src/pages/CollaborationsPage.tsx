import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { CollabCard } from "../components/cards/CollabCard";
import { CollaborationComposer } from "../components/composers/CollaborationComposer";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SkillTag } from "../components/ui/SkillTag";
import type { Peer } from "../lib/peerspace";
import type { Collaboration, NewCollaborationInput } from "../types/app";

const PROJECT_SUGGESTIONS = [
  { title: "Build a campus events app", skills: ["React", "UI Design"] },
  { title: "ML study group for midterms", skills: ["Python", "Machine Learning"] },
  { title: "Open-source contribution club", skills: ["Any language"] }
];

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
  const [composerTitle, setComposerTitle] = useState("");

  function openComposer(prefilledTitle = "") {
    setComposerTitle(prefilledTitle);
    setIsComposerOpen(true);
  }

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
          onClick={() => (isComposerOpen ? setIsComposerOpen(false) : openComposer())}
        >
          <Plus size={14} weight="bold" />
          {isComposerOpen ? "Close" : "New collaboration"}
        </button>
      </div>
      {isComposerOpen && (
        <CollaborationComposer
          key={composerTitle}
          initialTitle={composerTitle}
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
      {collaborations.length <= 2 && (
        <section className="suggestion-section">
          <SectionHeader label="Looking for project ideas?" compact />
          <div className="suggestion-grid">
            {PROJECT_SUGGESTIONS.map((suggestion) => (
              <article className="suggestion-card card" key={suggestion.title}>
                <strong>{suggestion.title}</strong>
                <div className="tag-cloud">
                  {suggestion.skills.map((skill) => (
                    <SkillTag key={skill} label={skill} />
                  ))}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => openComposer(suggestion.title)}
                >
                  Start this
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
