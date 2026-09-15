import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { StudentCard } from "../components/cards/StudentCard";
import { PageIntro } from "../components/ui/PageIntro";
import { loadSetting } from "../lib/appStorage";
import type { Peer } from "../lib/peerspace";

export function SearchPage({
  profile,
  peers,
  onMessagePeer,
  onInviteToCollaborate,
  onScheduleSession,
  pendingSearchQuery
}: {
  profile: Peer;
  peers: Peer[];
  onMessagePeer: (peer: Peer) => void;
  onInviteToCollaborate: (peer: Peer) => void;
  onScheduleSession: (peer: Peer) => void;
  pendingSearchQuery: { query: string; token: number } | null;
}) {
  const knows = profile.skills.filter((skill) => skill.type === "knows");
  const wants = profile.skills.filter((skill) => skill.type === "wants");
  const [matchTab, setMatchTab] = useState<"knows" | "wants">("knows");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(() => loadSetting(profile.id, "default-dept", "All"));
  const [year, setYear] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  useEffect(() => {
    if (pendingSearchQuery) setQuery(pendingSearchQuery.query);
    // Re-apply only when a new search is fired from elsewhere (token changes),
    // not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSearchQuery?.token]);

  const departments = ["All", ...new Set(peers.map((peer) => peer.department).filter(Boolean))];
  const years = ["All", ...new Set(peers.map((peer) => peer.year).filter(Boolean))];

  // A "good match" is someone who could teach me something I want to learn,
  // or learn something from me - this never hides anyone, it just decides
  // sort order and whether the "Good match" badge shows.
  const mySkills = matchTab === "knows" ? knows : wants;
  const theirType = matchTab === "knows" ? "wants" : "knows";
  function matchedSkillFor(peer: Peer) {
    if (mySkills.length === 0) return undefined;
    return peer.skills.find(
      (skill) =>
        skill.type === theirType &&
        mySkills.some((mine) => mine.name.toLowerCase() === skill.name.toLowerCase())
    )?.name;
  }
  function isGoodMatch(peer: Peer) {
    return Boolean(matchedSkillFor(peer));
  }

  const normalizedQuery = query.trim().toLowerCase();
  const results = peers
    .filter((peer) => {
      const matchesQuery =
        !normalizedQuery ||
        peer.name.toLowerCase().includes(normalizedQuery) ||
        peer.department.toLowerCase().includes(normalizedQuery) ||
        peer.skills.some((skill) => skill.name.toLowerCase().includes(normalizedQuery));
      const matchesDept = department === "All" || peer.department === department;
      const matchesYear = year === "All" || peer.year === year;
      const matchesVerified = !verifiedOnly || peer.verified;
      return matchesQuery && matchesDept && matchesYear && matchesVerified;
    })
    .sort((a, b) => Number(isGoodMatch(b)) - Number(isGoodMatch(a)));

  return (
    <div className="page-stack">
      <PageIntro
        title="Find someone who knows what you want to learn."
        body="Search by skill, department, or campus building. Matches stay verified and practical."
      />

      <div className="toggle-bar">
        <button
          className={matchTab === "knows" ? "toggle active" : "toggle"}
          onClick={() => setMatchTab("knows")}
        >
          Sort by who I can teach
        </button>
        <button
          className={matchTab === "wants" ? "toggle active" : "toggle"}
          onClick={() => setMatchTab("wants")}
        >
          Sort by who can teach me
        </button>
        <span>Showing {results.length} verified students</span>
      </div>

      {mySkills.length === 0 && (
        <p className="profile-meta">
          {matchTab === "knows"
            ? "Add skills you know on your profile to see who you can teach."
            : "Add skills you want to learn on your profile to see who can teach you."}
        </p>
      )}

      {(knows.length > 0 || wants.length > 0) && (
        <p className="profile-meta">
          {knows.length > 0 && <>You know: {knows.map((skill) => skill.name).join(", ")}</>}
          {knows.length > 0 && wants.length > 0 && " · "}
          {wants.length > 0 && <>Want to learn: {wants.map((skill) => skill.name).join(", ")}</>}
        </p>
      )}

      <div className="skill-search card">
        <MagnifyingGlass size={17} />
        <input
          aria-label="Search by skill, name, or department"
          placeholder="Search by skill, name, or department"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="clear-search"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        )}
      </div>

      <div className="filter-row">
        <div className="select-button">
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "All" ? "All departments" : dept}
              </option>
            ))}
          </select>
          <CaretDown size={14} />
        </div>
        <div className="select-button">
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            {years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption === "All" ? "All years" : yearOption}
              </option>
            ))}
          </select>
          <CaretDown size={14} />
        </div>
        <label className="check-filter">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
          />
          Verified Only
        </label>
      </div>

      <section className="student-results">
        {peers.length === 0 && (
          <p className="profile-meta">
            No other verified students yet — invite classmates to join PeerSpace.
          </p>
        )}
        {peers.length > 0 && results.length === 0 && (
          <p className="profile-meta">No matches for these filters — try widening your search.</p>
        )}
        {results.map((peer) => (
          <StudentCard
            key={peer.id}
            peer={peer}
            isGoodMatch={isGoodMatch(peer)}
            matchedSkill={matchedSkillFor(peer)}
            onMessage={onMessagePeer}
            onInviteToCollaborate={onInviteToCollaborate}
            onScheduleSession={onScheduleSession}
          />
        ))}
      </section>
    </div>
  );
}
