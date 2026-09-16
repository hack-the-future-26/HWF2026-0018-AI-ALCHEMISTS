export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  isBusy = false,
  onConfirm,
  onCancel
}: {
  title: string;
  body: string;
  confirmLabel: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="modal-card">
        <div className="card confirm-dialog" role="alertdialog" aria-label={title}>
          <strong>{title}</strong>
          <p className="profile-meta">{body}</p>
          <div className="button-row">
            <button className="btn btn-danger" type="button" onClick={onConfirm} disabled={isBusy}>
              {isBusy ? "Deleting..." : confirmLabel}
            </button>
            <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={isBusy}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
