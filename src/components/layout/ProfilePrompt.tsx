export function ProfilePrompt({
  onCustomize,
  onDismiss
}: {
  onCustomize: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="profile-prompt">
      <span>
        Welcome to PeerSpace! Add your college, major, and bio so classmates can find you.
      </span>
      <div className="profile-prompt-actions">
        <button className="btn btn-primary" type="button" onClick={onCustomize}>
          Customize profile
        </button>
        <button className="btn btn-secondary" type="button" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
