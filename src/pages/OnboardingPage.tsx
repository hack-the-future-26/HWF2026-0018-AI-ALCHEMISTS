import type { Session } from "@supabase/supabase-js";
import { FormEvent, useState } from "react";
import { fetchProfile, mapUserRowToPeer, type Peer, upsertProfile } from "../lib/peerspace";
import { supabase } from "../lib/supabase";

export function OnboardingPage({
  session,
  onSaved
}: {
  session: Session;
  onSaved: (peer: Peer) => void;
}) {
  const email = session.user.email ?? "";
  const metadata = session.user.user_metadata ?? {};
  const [fullName, setFullName] = useState((metadata.full_name as string) ?? "");
  const [college, setCollege] = useState((metadata.college as string) ?? "");
  const [major, setMajor] = useState((metadata.major as string) ?? "");
  const [academicYear, setAcademicYear] = useState((metadata.academic_year as string) ?? "");
  const [bio, setBio] = useState((metadata.bio as string) ?? "");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setStatus("pending");
    setError("");
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) throw new Error("Your session expired. Please log in again.");
      await upsertProfile(user.id, { fullName, college, major, academicYear, bio });
      const row = await fetchProfile(user.id);
      onSaved(mapUserRowToPeer(row, user.email ?? email));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    }
  }

  return (
    <div className="landing-shell">
      <div className="landing-card card">
        <div className="brand">
          <span className="brand-mark">PS</span>
          <div>
            <strong>PeerSpace</strong>
            <span className="network-pill">Campus network</span>
          </div>
        </div>
        <h1>Confirm your profile</h1>
        <p>
          We saved these details from sign-up — this is what classmates will see on PeerSpace.
        </p>
        <form className="create-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Full name</span>
            <input required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="field">
            <span>College</span>
            <input
              required
              value={college}
              onChange={(event) => setCollege(event.target.value)}
              placeholder="PeerSpace College"
            />
          </label>
          <label className="field">
            <span>Major</span>
            <input
              required
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              placeholder="Computer Science"
            />
          </label>
          <label className="field">
            <span>Academic year</span>
            <input
              required
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              placeholder="Junior"
            />
          </label>
          <label className="field">
            <span>Bio</span>
            <textarea
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="What are you looking to learn or teach?"
            />
          </label>
          {status === "error" && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={status === "pending"}>
            {status === "pending" ? "Saving..." : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
