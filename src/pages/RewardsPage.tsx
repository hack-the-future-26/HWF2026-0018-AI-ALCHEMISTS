import { Lock } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { PageIntro } from "../components/ui/PageIntro";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { Peer } from "../lib/peerspace";
import { BADGE_DEFINITIONS, type BadgeType, fetchBadges, levelLabel } from "../lib/rewards";

const EARNING_ACTIONS = [
  { action: "Complete a teaching session", coins: "+50 🪙" },
  { action: "Receive a 5-star review", coins: "+25 🪙" },
  { action: "Start a collaboration", coins: "+30 🪙" },
  { action: "Sync your GitHub profile", coins: "+20 🪙" },
  { action: "Post to Campus Feed", coins: "+5 🪙" },
  { action: "Daily streak (coming soon)", coins: "+10/day 🪙" }
];

const PARTNER_REWARDS = [
  { partner: "Udemy", color: "#a435f0", description: "20% off any course", cost: 1000 },
  { partner: "Amazon", color: "#ff9900", description: "₹50 / $5 voucher", cost: 500 },
  { partner: "Coursera", color: "#0056d3", description: "1 free month", cost: 2000 },
  { partner: "Notion", color: "#191919", description: "Notion Pro, 3 months", cost: 1500 }
];

export function RewardsPage({ profile }: { profile: Peer }) {
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);

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

  return (
    <div className="page-stack rewards-page">
      <PageIntro
        title="PeerCoins reward the peers who show up for each other."
        body="Teach sessions, collaborate, and share your work to climb the ranks."
      />

      <section className="card stat-tile-row">
        <div className="stat-tile">
          <span>PeerCoins</span>
          <strong>🪙 {profile.peerCoins}</strong>
        </div>
        <div className="stat-tile">
          <span>Current Level</span>
          <strong>⚡ {levelLabel(profile.level)}</strong>
        </div>
        <div className="stat-tile">
          <span>Sessions Taught</span>
          <strong>{profile.totalSessionsTaught}</strong>
        </div>
        <div className="stat-tile">
          <span>Badges Earned</span>
          <strong>{earnedBadges.length}</strong>
        </div>
      </section>

      <div className="rewards-columns">
        <section className="card">
          <SectionHeader label="How to earn" compact />
          <div className="earn-list">
            {EARNING_ACTIONS.map((item) => (
              <div className="earn-row" key={item.action}>
                <span>{item.action}</span>
                <strong>{item.coins}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <SectionHeader label="Badges" compact />
          <div className="badge-grid">
            {BADGE_DEFINITIONS.map((badge) => {
              const unlocked = earnedBadges.includes(badge.type);
              return (
                <div className={unlocked ? "badge-card unlocked" : "badge-card locked"} key={badge.type}>
                  {!unlocked && <Lock className="badge-lock" size={14} weight="bold" />}
                  <span className="badge-emoji">{badge.emoji}</span>
                  <strong>{badge.label}</strong>
                  <p>{badge.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card redeem-section">
        <span className="redeem-banner">🚀 Brand partnerships launching post-beta</span>
        <SectionHeader label="Redeem your PeerCoins" compact />
        <p className="profile-meta">Partner rewards coming soon — here&apos;s what&apos;s dropping</p>
        <div className="reward-grid">
          {PARTNER_REWARDS.map((reward) => (
            <article className="reward-card" key={reward.partner}>
              <span className="coming-soon-overlay">Coming Soon</span>
              <div className="partner-logo" style={{ background: reward.color }}>
                {reward.partner}
              </div>
              <p>{reward.description}</p>
              <div className="reward-card-footer">
                <strong>{reward.cost} 🪙</strong>
                <button className="btn btn-primary reward-redeem" type="button" disabled>
                  Redeem
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
