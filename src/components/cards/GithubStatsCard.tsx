import { GithubLogo } from "@phosphor-icons/react";
import type { GithubStats } from "../../lib/peerspace";
import { ContributionCalendar } from "./ContributionCalendar";

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051"
};

function colorForLanguage(name: string) {
  return LANGUAGE_COLORS[name] ?? "#8a8f98";
}

export function GithubStatsCard({ github }: { github: GithubStats }) {
  return (
    <article className="card github-card">
      <div className="github-card-head">
        {github.avatarUrl ? (
          <img className="github-avatar" src={github.avatarUrl} alt="" width={22} height={22} />
        ) : (
          <GithubLogo size={18} weight="fill" />
        )}
        <a
          href={`https://github.com/${github.username}`}
          target="_blank"
          rel="noreferrer"
        >
          @{github.username}
        </a>
        <span className="github-repo-count">{github.reposCount} public repos</span>
      </div>
      {github.bio && <p className="github-bio">{github.bio}</p>}
      {github.topLanguages.length > 0 && (
        <div className="github-languages">
          {github.topLanguages.map((language) => (
            <span key={language} className="github-language">
              <i style={{ background: colorForLanguage(language) }} />
              {language}
            </span>
          ))}
        </div>
      )}
      <ContributionCalendar
        weeks={github.contributionWeeks}
        totalContributions={github.totalContributions}
      />
    </article>
  );
}
