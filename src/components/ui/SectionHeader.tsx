export function SectionHeader({
  label,
  compact = false
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <header className={compact ? "section-header compact" : "section-header"}>
      <span>{label}</span>
    </header>
  );
}
