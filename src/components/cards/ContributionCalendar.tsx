import type { ContributionWeek } from "../../lib/github";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const CELL_STEP = 14; // 11px cell + 3px gap - must match .contribution-day/.contribution-week in styles.css

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function monthLabels(weeks: ContributionWeek[]) {
  const labels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstDay = week[0];
    if (!firstDay) return;
    const month = new Date(firstDay.date).getUTCMonth();
    if (month !== lastMonth) {
      labels.push({ weekIndex, label: MONTH_NAMES[month] });
      lastMonth = month;
    }
  });
  return labels;
}

export function ContributionCalendar({
  weeks,
  totalContributions
}: {
  weeks: ContributionWeek[];
  totalContributions: number;
}) {
  if (weeks.length === 0) return null;

  return (
    <div className="contribution-calendar">
      <p className="contribution-total">{totalContributions} contributions in the last year</p>
      <div className="contribution-scroll">
        <div className="contribution-months" style={{ width: weeks.length * CELL_STEP }}>
          {monthLabels(weeks).map(({ weekIndex, label }) => (
            <span key={weekIndex} style={{ left: weekIndex * CELL_STEP }}>
              {label}
            </span>
          ))}
        </div>
        <div className="contribution-body">
          <div className="contribution-day-labels">
            <span style={{ gridRow: 2 }}>Mon</span>
            <span style={{ gridRow: 4 }}>Wed</span>
            <span style={{ gridRow: 6 }}>Fri</span>
          </div>
          <div className="contribution-weeks">
            {weeks.map((week, weekIndex) => (
              <div className="contribution-week" key={weekIndex}>
                {week.map((day) => (
                  <span
                    key={day.date}
                    className={`contribution-day level-${levelForCount(day.count)}`}
                    title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="contribution-legend">
        <span>Less</span>
        <i className="level-0" />
        <i className="level-1" />
        <i className="level-2" />
        <i className="level-3" />
        <i className="level-4" />
        <span>More</span>
      </div>
    </div>
  );
}
