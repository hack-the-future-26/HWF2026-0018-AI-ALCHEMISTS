import { Camera } from "@phosphor-icons/react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { GithubStatsCard } from "../components/cards/GithubStatsCard";
import { Avatar } from "../components/ui/Avatar";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SkillTag } from "../components/ui/SkillTag";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import { loadRollNumber, saveRollNumber } from "../lib/appStorage";
import {
  fetchProfile,
  mapUserRowToPeer,
  meaningfulBio,
  type Peer,
  syncSkills,
  updateAvatarUrl,
  uploadAvatarImage,
  upsertProfile
} from "../lib/peerspace";
import { BADGE_DEFINITIONS, type BadgeType, fetchBadges, levelLabel } from "../lib/rewards";

// The skill fields stay raw text while editing. Parsing on every keystroke and
// re-joining for display ate the comma as soon as it was typed, because
// "React," split+filtered back down to "React".
type ProfileFields = {
  name: string;
  department: string;
  year: string;
  building: string;
  bio: string;
  skillsOffered: string;
  skillsWanted: string;
};

function skillsOfType(peer: Peer, type: "knows" | "wants") {
  return peer.skills
    .filter((skill) => skill.type === type)
    .map((skill) => skill.name)
    .join(", ");
}

function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function toProfileFields(peer: Peer): ProfileFields {
  return {
    name: peer.name,
    department: peer.department,
    year: peer.year,
    building: peer.building,
    bio: peer.bio,
    skillsOffered: skillsOfType(peer, "knows"),
    skillsWanted: skillsOfType(peer, "wants")
  };
}

// Keeps whatever the user already had saved selectable, so switching these
// fields to dropdowns can't silently rewrite an existing value.
function withCurrent(options: readonly string[], current: string): string[] {
  const trimmed = current.trim();
  return trimmed && !options.some((option) => option.toLowerCase() === trimmed.toLowerCase())
    ? [trimmed, ...options]
    : [...options];
}

const MAJOR_OPTIONS = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Mathematics",
  "Physics",
  "Business",
  "Economics",
  "Design",
  "Psychology",
  "Other"
] as const;

const ACADEMIC_YEAR_OPTIONS = [
  "First year",
  "Second year",
  "Third year",
  "Fourth year",
  "Final year",
  "Graduate",
  "Postgraduate"
] as const;

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
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(profile.avatarUrl ?? "");
  const [avatarStatus, setAvatarStatus] = useState<"idle" | "uploading" | "error">("idle");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBadges(profile.id)
      .then((badges) => {
        if (!cancelled) setEarnedBadges(badges);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  useEffect(() => {
    if (!startInEditMode) return;
    setDraft(toProfileFields(profile));
    setRollDraft(loadRollNumber(profile.id));
    setAvatarUrlDraft(profile.avatarUrl ?? "");
    setIsEditing(true);
    onEditModeConsumed?.();
    // Only respond to the prop turning on; profile/rollDraft changes while
    // already editing should not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startInEditMode]);

  function startEditing() {
    setDraft(toProfileFields(profile));
    setRollDraft(rollNumber);
    setAvatarUrlDraft(profile.avatarUrl ?? "");
    setStatus("idle");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(toProfileFields(profile));
    setRollDraft(rollNumber);
    setAvatarUrlDraft(profile.avatarUrl ?? "");
    setIsEditing(false);
  }

  async function refreshProfile() {
    const row = await fetchProfile(profile.id);
    onProfileSaved(mapUserRowToPeer(row, profile.collegeEmail));
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarStatus("uploading");
    try {
      const url = await uploadAvatarImage(profile.id, file);
      await updateAvatarUrl(profile.id, url);
      setAvatarUrlDraft(url);
      await refreshProfile();
      setAvatarStatus("idle");
    } catch {
      setAvatarStatus("error");
    }
  }

  async function handleAvatarUrlSave() {
    const trimmed = avatarUrlDraft.trim();
    if (!trimmed) return;
    setAvatarStatus("uploading");
    try {
      await updateAvatarUrl(profile.id, trimmed);
      await refreshProfile();
      setAvatarStatus("idle");
    } catch {
      setAvatarStatus("error");
    }
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
      await syncSkills(profile.id, parseSkills(draft.skillsOffered), parseSkills(draft.skillsWanted));
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
            <div className="avatar-upload">
              <div className="avatar-upload-preview">
                <Avatar
                  peer={{ ...profile, avatarUrl: avatarUrlDraft || profile.avatarUrl }}
                  size="lg"
                />
                <button
                  type="button"
                  className="avatar-upload-camera"
                  onClick={() => avatarFileInputRef.current?.click()}
                  aria-label="Change profile picture"
                >
                  <Camera size={14} weight="fill" />
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="avatar-upload-input"
                  onChange={handleAvatarFileChange}
                />
              </div>
              <label className="field">
                <span>Or paste a profile picture URL</span>
                <div className="avatar-url-row">
                  <input
                    value={avatarUrlDraft}
                    onChange={(event) => setAvatarUrlDraft(event.target.value)}
                    placeholder="https://..."
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleAvatarUrlSave}>
                    Save
                  </button>
                </div>
              </label>
              {avatarStatus === "uploading" && <p className="profile-meta">Uploading...</p>}
              {avatarStatus === "error" && (
                <p className="form-error">Could not update your photo. Try the URL field instead.</p>
              )}
            </div>
            <label className="field">
              <span>Name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Major</span>
              <select
                value={draft.department}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, department: event.target.value }))
                }
              >
                <option value="">Select a major</option>
                {withCurrent(MAJOR_OPTIONS, profile.department).map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Academic year</span>
              <select
                value={draft.year}
                onChange={(event) => setDraft((d) => ({ ...d, year: event.target.value }))}
              >
                <option value="">Select a year</option>
                {withCurrent(ACADEMIC_YEAR_OPTIONS, profile.year).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
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
                value={draft.skillsOffered}
                placeholder="HTML, JavaScript, TypeScript"
                onChange={(event) =>
                  setDraft((d) => ({ ...d, skillsOffered: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Wants to learn (comma separated)</span>
              <input
                value={draft.skillsWanted}
                placeholder="React, Figma"
                onChange={(event) =>
                  setDraft((d) => ({ ...d, skillsWanted: event.target.value }))
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
              <div className="reward-summary">
                <span className="level-pill">⚡ {levelLabel(profile.level)}</span>
                <span className="coins-pill">🪙 {profile.peerCoins} PeerCoins</span>
                {earnedBadges.length > 0 && (
                  <span className="badge-icon-row">
                    {BADGE_DEFINITIONS.filter((badge) => earnedBadges.includes(badge.type))
                      .slice(0, 3)
                      .map((badge) => (
                        <span key={badge.type} className="badge-icon" title={badge.label}>
                          {badge.emoji}
                        </span>
                      ))}
                  </span>
                )}
              </div>
              <p>
                {profile.department} · {profile.year}
              </p>
              <p className="profile-meta">{profile.building}</p>
              {profile.collegeEmail && <p className="profile-meta">{profile.collegeEmail}</p>}
              {rollNumber && <p className="profile-meta">Roll number: {rollNumber}</p>}
              {meaningfulBio(profile.bio) ? (
                <blockquote>{meaningfulBio(profile.bio)}</blockquote>
              ) : (
                <p className="profile-meta bio-empty">
                  No bio yet — add one from Edit Profile.
                </p>
              )}
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
            {profile.github && <GithubStatsCard github={profile.github} />}
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
              <p className="learning-goal-empty">
                <em>What do you want to learn next?</em>
                <button type="button" className="learning-goal-add" onClick={startEditing}>
                  + Add goal
                </button>
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
