export function SkillTag({ label, wants = false }: { label: string; wants?: boolean }) {
  return <span className={wants ? "skill-tag wants" : "skill-tag"}>{label}</span>;
}
