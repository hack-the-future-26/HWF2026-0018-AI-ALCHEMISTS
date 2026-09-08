import { SectionHeader } from "../ui/SectionHeader";

export function SpotlightWidget() {
  return (
    <article className="widget card">
      <SectionHeader label="Skill Exchange Spotlight" compact />
      <h3>Teach a skill. Learn one back.</h3>
      <p>Match with a verified peer based on your goals and availability.</p>
      <button className="btn btn-primary">Start exchange</button>
    </article>
  );
}
