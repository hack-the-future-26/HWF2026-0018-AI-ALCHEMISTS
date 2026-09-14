import { useState } from "react";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeader } from "../components/ui/SectionHeader";
import { VerifiedBadge } from "../components/ui/VerifiedBadge";
import type { Peer } from "../lib/peerspace";
import type { ThemePreference } from "../types/app";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" }
];

function formatMemberSince(createdAt: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    new Date(createdAt)
  );
}

export function SettingsPage({
  profile,
  themePreference,
  onSetThemePreference,
  onLogout
}: {
  profile: Peer;
  themePreference: ThemePreference;
  onSetThemePreference: (value: ThemePreference) => void;
  onLogout: () => void;
}) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [newMessageAlerts, setNewMessageAlerts] = useState(true);

  return (
    <div className="page-stack">
      <PageIntro
        title="Tune the way PeerSpace works for you."
        body="Appearance, notifications, and account details in one place."
      />

      <section className="card settings-section">
        <SectionHeader label="Appearance" compact />
        <div className="settings-row-inline">
          <strong>Theme</strong>
          <div className="segmented-control" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={themePreference === option.value}
                className={themePreference === option.value ? "segment active" : "segment"}
                onClick={() => onSetThemePreference(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card settings-section">
        <SectionHeader label="Notifications" compact />
        <label className="settings-toggle-row">
          <span>Email notifications</span>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(event) => setEmailNotifications(event.target.checked)}
          />
        </label>
        <label className="settings-toggle-row">
          <span>Session reminders</span>
          <input
            type="checkbox"
            checked={sessionReminders}
            onChange={(event) => setSessionReminders(event.target.checked)}
          />
        </label>
        <label className="settings-toggle-row">
          <span>New message alerts</span>
          <input
            type="checkbox"
            checked={newMessageAlerts}
            onChange={(event) => setNewMessageAlerts(event.target.checked)}
          />
        </label>
      </section>

      <section className="card settings-section">
        <SectionHeader label="Account" compact />
        <div className="account-detail-row">
          <span>Email</span>
          <strong>{profile.collegeEmail || "—"}</strong>
        </div>
        <div className="account-detail-row">
          <span>College</span>
          <strong>{profile.building || "—"}</strong>
        </div>
        <div className="account-detail-row">
          <span>Member since</span>
          <strong>{formatMemberSince(profile.createdAt)}</strong>
        </div>
        <div className="account-detail-row">
          <span>Verification status</span>
          {profile.verified ? <VerifiedBadge /> : <span className="tag">Unverified</span>}
        </div>
        <button className="btn btn-secondary settings-logout" onClick={onLogout}>
          Log out
        </button>
      </section>

      <section className="card settings-section about-section">
        <SectionHeader label="About" compact />
        <p>PeerSpace v1.0.0-beta</p>
        <p>Built with ❤️ for campus learning</p>
        <p className="profile-meta">© 2026 PeerSpace</p>
      </section>
    </div>
  );
}
