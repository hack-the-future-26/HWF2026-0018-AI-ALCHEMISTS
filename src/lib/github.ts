const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

export type ContributionDay = { date: string; count: number };
export type ContributionWeek = ContributionDay[];

export type GithubImportData = {
  username: string;
  bio: string;
  avatarUrl: string;
  publicRepos: number;
  topLanguages: string[];
  recentActivity: number;
  contributionWeeks: ContributionWeek[];
  totalContributions: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

async function githubFetch(path: string, token: string): Promise<any> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return response.json();
}

function topLanguagesFromRepos(repos: any[]): string[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language || repo.fork) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([language]) => language);
}

function recentActivityFromEvents(events: any[]): number {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return events.filter((event) => new Date(event.created_at).getTime() >= thirtyDaysAgo).length;
}

// The REST API has no "contributions in the last year" endpoint - that
// calendar is only available through the GraphQL API's contributionCalendar,
// scoped to whichever account the OAuth token belongs to ("viewer").
async function fetchContributionCalendar(
  token: string
): Promise<{ weeks: ContributionWeek[]; total: number }> {
  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `query {
        viewer {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }`
    })
  });
  if (!response.ok) throw new Error(`GitHub GraphQL error: ${response.status}`);

  const json = await response.json();
  const calendar = json?.data?.viewer?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error("No contribution calendar in GitHub response");

  const weeks: ContributionWeek[] = calendar.weeks.map((week: any) =>
    week.contributionDays.map((day: any) => ({
      date: day.date as string,
      count: day.contributionCount as number
    }))
  );
  return { weeks, total: calendar.totalContributions ?? 0 };
}

export async function fetchGithubImportData(token: string): Promise<GithubImportData> {
  const user = await githubFetch("/user", token);
  const repos = await githubFetch("/user/repos?per_page=100&affiliation=owner&sort=updated", token).catch(
    () => []
  );
  const events = await githubFetch(`/users/${user.login}/events/public?per_page=100`, token).catch(
    () => []
  );
  const contributions = await fetchContributionCalendar(token).catch(() => null);

  return {
    username: user.login,
    bio: user.bio ?? "",
    avatarUrl: user.avatar_url ?? "",
    publicRepos: user.public_repos ?? 0,
    topLanguages: topLanguagesFromRepos(Array.isArray(repos) ? repos : []),
    recentActivity: recentActivityFromEvents(Array.isArray(events) ? events : []),
    contributionWeeks: contributions?.weeks ?? [],
    totalContributions: contributions?.total ?? 0
  };
}
