import { SectionHeader } from "../ui/SectionHeader";

const trending = [
  ["React", "42 peers"],
  ["Figma", "38 peers"],
  ["Machine Learning", "31 peers"],
  ["Node.js", "28 peers"],
  ["Python", "26 peers"],
  ["User Research", "19 peers"]
];

export function TrendingSkillsWidget() {
  return (
    <article className="widget card">
      <SectionHeader label="Trending Skills" compact />
      <ol className="rank-list">
        {trending.map(([skill, count], index) => (
          <li key={skill}>
            <span>{index + 1}</span>
            <strong>{skill}</strong>
            <em>{count}</em>
          </li>
        ))}
      </ol>
    </article>
  );
}
