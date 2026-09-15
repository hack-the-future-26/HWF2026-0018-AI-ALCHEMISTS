import { ArrowLeft } from "@phosphor-icons/react";

export function SectionHeader({
  label,
  compact = false,
  onBack
}: {
  label: string;
  compact?: boolean;
  onBack?: () => void;
}) {
  return (
    <header className={compact ? "section-header compact" : "section-header"}>
      {onBack && (
        <button type="button" className="back-arrow" onClick={onBack} aria-label="Back">
          <ArrowLeft size={14} weight="bold" />
        </button>
      )}
      <span>{label}</span>
    </header>
  );
}
