const ANNOUNCEMENT =
  "Campus announcements: design critique room opens at 4 PM, ML study pod moved to Library Commons, CS society has 3 teammate seats open.";

export function AnnouncementStrip() {
  return (
    <div className="announcement">
      <span className="status-dot" />
      <div className="marquee">
        <div className="marquee-track">
          <span>{ANNOUNCEMENT}</span>
          <span aria-hidden="true">{ANNOUNCEMENT}</span>
        </div>
      </div>
    </div>
  );
}
