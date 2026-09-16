import type { Peer } from "../../lib/peerspace";
import { ScheduleSessionForm, type ScheduleSessionInput } from "../composers/ScheduleSessionForm";

export function ScheduleSessionModal({
  peer,
  isSubmitting,
  onSubmit,
  onCancel
}: {
  peer: Peer;
  isSubmitting?: boolean;
  onSubmit: (input: ScheduleSessionInput) => void;
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
        <ScheduleSessionForm
          peer={peer}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
