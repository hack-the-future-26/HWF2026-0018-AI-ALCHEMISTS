export function MiniLineChart() {
  return (
    <svg className="mini-chart" viewBox="0 0 220 76" role="img" aria-label="Activity trend">
      <polyline
        points="4,56 34,48 64,52 94,30 124,38 154,20 186,26 216,12"
        fill="none"
        stroke="#1B5E35"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <line x1="4" y1="68" x2="216" y2="68" stroke="#EBEBEB" />
      <line x1="4" y1="44" x2="216" y2="44" stroke="#EBEBEB" />
      <line x1="4" y1="20" x2="216" y2="20" stroke="#EBEBEB" />
    </svg>
  );
}
