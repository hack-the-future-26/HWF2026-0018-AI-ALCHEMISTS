import { FormEvent, useEffect, useState } from "react";
import { Avatar } from "../components/ui/Avatar";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SkillTag } from "../components/ui/SkillTag";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { loadRollNumber, saveRollNumber } from "../lib/appStorage";
import { fetchProfile, mapUserRowToPeer, type Peer, syncSkills, upsertProfile } from "../lib/peerspace";

type ProfileFields = {
  name: string;
  department: string;
  year: string;
  building: string;
  bio: string;
  skillsOffered: string[];
  skillsWanted: string[];
};

function toProfileFields(peer: Peer): ProfileFields {
  return {
    name: peer.name,
    department: peer.department,
    year: peer.year,
    building: peer.building,
    bio: peer.bio,
    skillsOffered: peer.skills.filter((skill) => skill.type === "knows").map((skill) => skill.name),
    skillsWanted: peer.skills.filter((skill) => skill.type === "wants").map((skill) => skill.name)
  };
}

export function ProfilePage({
  profile,
  onProfileSaved,
  startInEditMode = false,
  onEditModeConsumed
}: {
  profile: Peer;
  onProfileSaved: (peer: Peer) => void;
  startInEditMode?: boolean;
  onEditModeConsumed?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [draft, setDraft] = useState<ProfileFields>(() => toProfileFields(profile));
  const [rollNumber, setRollNumber] = useState(() => loadRollNumber(profile.id));
  const [rollDraft, setRollDraft] = useState(rollNumber);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!startInEditMode) return;
    setDraft(toProfileFields(profile));
    setRollDraft(loadRollNumber(profile.id));
    setIsEditing(true);
    onEditModeConsumed?.();
    // Only respond to the prop turning on; profile/rollDraft changes while
    // already editing should not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startInEditMode]);

  function startEditing() {
    setDraft(toProfileFields(profile));
    setRollDraft(rollNumber);
    setStatus("idle");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(toProfileFields(profile));
    setRollDraft(rollNumber);
    setIsEditing(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    setError("");
    try {
      await upsertProfile(profile.id, {
        fullName: draft.name,
        college: draft.building,
        major: draft.department,
        academicYear: draft.year,
        bio: draft.bio
      });
      await syncSkills(profile.id, draft.skillsOffered, draft.skillsWanted);
      saveRollNumber(profile.id, rollDraft);
      setRollNumber(rollDraft);
      const row = await fetchProfile(profile.id);
      onProfileSaved(mapUserRowToPeer(row, profile.collegeEmail));
      setIsEditing(false);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    }
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Your profile is how peers understand your fit."
        body="Keep your offered skills, learning goals, and campus availability specific."
      />
      <section className="profile-grid">
        {isEditing ? (
          <form className="card profile-edit-form" onSubmit={saveProfile}>
            <SectionHeader label="Edit profile" compact />
            <label className="field">
              <span>Name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Major</span>
              <input
                value={draft.department}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, department: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Academic year</span>
              <input
                value={draft.year}
                onChange={(event) => setDraft((d) => ({ ...d, year: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>College</span>
              <input
                value={draft.building}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, building: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Roll number (saved on this device only)</span>
              <input
                value={rollDraft}
                onChange={(event) => setRollDraft(event.target.value)}
                placeholder="21CS045"
              />
            </label>
            <label className="field">
              <span>Bio</span>
              <textarea
                value={draft.bio}
                rows={3}
                onChange={(event) => setDraft((d) => ({ ...d, bio: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Skills offered (comma separated)</span>
              <input
                value={draft.skillsOffered.join(", ")}
                onChange={(event) =>
                  setDraft((d) => ({
                    ...d,
                    skillsOffered: event.target.value
                      .split(",")
                      .map((skill) => skill.trim())
                      .filter(Boolean)
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Wants to learn (comma separated)</span>
              <input
                value={draft.skillsWanted.join(", ")}
                onChange={(event) =>
                  setDraft((d) => ({
                    ...d,
                    skillsWanted: event.target.value
                      .split(",")
                      .map((skill) => skill.trim())
                      .filter(Boolean)
                  }))
                }
              />
            </label>
            {status === "error" && <p className="form-error">{error}</p>}
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={status === "pending"}>
                {status === "pending" ? "Saving..." : "Save"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <article className="card profile-summary">
            <Avatar peer={profile} size="lg" />
            <div>
              <div className="identity-line">
                <h3>{profile.name}</h3>
                <VerifiedBadge />
              </div>
              <p>
                {profile.department} · {profile.year}
              </p>
              <p className="profile-meta">{profile.building}</p>
              {profile.collegeEmail && <p className="profile-meta">{profile.collegeEmail}</p>}
              {rollNumber && <p className="profile-meta">Roll number: {rollNumber}</p>}
              <blockquote>{profile.bio}</blockquote>
            </div>
            <div className="skill-columns">
              <div>
                <SectionHeader label="Skills offered" compact />
                <div className="tag-cloud">
                  {profile.skills
                    .filter((skill) => skill.type === "knows")
                    .map((skill) => (
                      <SkillTag key={skill.name} label={skill.name} />
                    ))}
                </div>
              </div>
              <div>
                <SectionHeader label="Wants to learn" compact />
                <div className="tag-cloud">
                  {profile.skills
                    .filter((skill) => skill.type === "wants")
                    .map((skill) => (
                      <SkillTag key={skill.name} label={skill.name} wants />
                    ))}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary profile-edit-trigger" onClick={startEditing}>
              Edit profile
            </button>
          </article>
        )}
        <article className="card">
          <SectionHeader label="Learning goals" compact />
          <div className="tag-cloud">
            {profile.skills
              .filter((skill) => skill.type === "wants")
              .map((skill) => (
                <SkillTag key={skill.name} label={skill.name} wants />
              ))}
            {profile.skills.filter((skill) => skill.type === "wants").length === 0 && (
              <p className="profile-meta">Add skills you want to learn from the edit form.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
