import { useState } from "react";
import { PageIntro } from "../components/ui/PageIntro";
import { loadSetting, saveSetting } from "../lib/appStorage";
import type { Peer } from "../lib/peerspace";

export function SettingsPage({
  profile,
  peers,
  messageNotificationsEnabled,
  onToggleMessageNotifications
}: {
  profile: Peer;
  peers: Peer[];
  messageNotificationsEnabled: boolean;
  onToggleMessageNotifications: (value: boolean) => void;
}) {
  const [visibility, setVisibility] = useState(() =>
    loadSetting(profile.id, "visibility", "verified")
  );
  const [defaultDept, setDefaultDept] = useState(() =>
    loadSetting(profile.id, "default-dept", "All")
  );
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const departments = ["All", ...new Set(peers.map((peer) => peer.department).filter(Boolean))];

  function updateVisibility(value: string) {
    setVisibility(value);
    saveSetting(profile.id, "visibility", value);
    setEditingRow(null);
  }

  function updateDefaultDept(value: string) {
    setDefaultDept(value);
    saveSetting(profile.id, "default-dept", value);
    setEditingRow(null);
  }

  return (
    <div className="page-stack">
      <PageIntro
        title="Tune the way PeerSpace works for you."
        body="Manage visibility, notifications, verified status, and matching preferences."
      />
      <section className="settings-list">
        <article className="settings-row card">
          <div>
            <strong>Campus visibility</strong>
            <p>
              {visibility === "verified"
                ? "Visible to verified students only."
                : "Hidden from Search results."}
            </p>
          </div>
          {editingRow === "visibility" ? (
            <select
              autoFocus
              value={visibility}
              onChange={(event) => updateVisibility(event.target.value)}
              onBlur={() => setEditingRow(null)}
            >
              <option value="verified">Visible to verified students only</option>
              <option value="hidden">Hidden from Search results</option>
            </select>
          ) : (
            <button className="btn btn-secondary" onClick={() => setEditingRow("visibility")}>
              Edit
            </button>
          )}
        </article>

        <article className="settings-row card">
          <div>
            <strong>Message notifications</strong>
            <p>
              {messageNotificationsEnabled
                ? "Unread message badge is on."
                : "Unread message badge is muted."}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => onToggleMessageNotifications(!messageNotificationsEnabled)}
          >
            {messageNotificationsEnabled ? "Turn off" : "Turn on"}
          </button>
        </article>

        <article className="settings-row card">
          <div>
            <strong>Verified profile</strong>
            <p>
              {profile.verified
                ? "Verified via your college email."
                : "Not verified yet — confirm your college email."}
            </p>
          </div>
          <span className="tag">{profile.verified ? "Verified" : "Unverified"}</span>
        </article>

        <article className="settings-row card">
          <div>
            <strong>Default search department</strong>
            <p>
              {defaultDept === "All"
                ? "Search shows every department by default."
                : `Search defaults to ${defaultDept}.`}
            </p>
          </div>
          {editingRow === "default-dept" ? (
            <select
              autoFocus
              value={defaultDept}
              onChange={(event) => updateDefaultDept(event.target.value)}
              onBlur={() => setEditingRow(null)}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All departments" : dept}
                </option>
              ))}
            </select>
          ) : (
            <button className="btn btn-secondary" onClick={() => setEditingRow("default-dept")}>
              Edit
            </button>
          )}
        </article>
      </section>
    </div>
  );
}
