export function SkillTag({
  label,
  wants = false,
  matched = false
}: {
  label: string;
  wants?: boolean;
  matched?: boolean;
}) {
  const className = ["skill-tag", wants && "wants", matched && "match"].filter(Boolean).join(" ");
  return <span className={className}>{label}</span>;
}
