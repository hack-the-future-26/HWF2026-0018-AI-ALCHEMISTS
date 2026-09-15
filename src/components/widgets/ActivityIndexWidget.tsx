import { SectionHeader } from "../ui/SectionHeader";
import { MiniLineChart } from "../ui/MiniLineChart";

export function ActivityIndexWidget() {
  return (
    <article className="widget card">
      <SectionHeader label="Campus Activity Index" compact />
      <div className="activity-number">
        <strong>128</strong>
        <span>peers currently active</span>
      </div>
      <MiniLineChart />
      <p>Peak Hours: 4 PM to 7 PM</p>
    </article>
  );
}
