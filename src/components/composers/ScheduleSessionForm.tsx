import { FormEvent, useState } from "react";
import type { Peer } from "../../lib/peerspace";
import { SectionHeader } from "../ui/SectionHeader";

export type ScheduleSessionInput = {
  topic: string;
  scheduledFor: string;
  notes: string;
};

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function nextHalfHour(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (date.getMinutes() === 0) date.setHours(date.getHours() + 1);
  return toLocalInputValue(date);
}

export function ScheduleSessionForm({
  peer,
  isSubmitting = false,
  onSubmit,
  onCancel
}: {
  peer: Peer;
  isSubmitting?: boolean;
  onSubmit: (input: ScheduleSessionInput) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [scheduledFor, setScheduledFor] = useState(nextHalfHour);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const earliest = toLocalInputValue(new Date());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (topic.trim().length < 3 || !scheduledFor) return;
    if (new Date(scheduledFor).getTime() <= Date.now()) {
      setError("Pick a time in the future.");
      return;
    }
    setError(null);
    onSubmit({
      topic: topic.trim(),
      scheduledFor: new Date(scheduledFor).toISOString(),
      notes: notes.trim()
    });
  }

  return (
    <form className="card create-form" onSubmit={handleSubmit}>
      <SectionHeader label={`Schedule a session with ${peer.name}`} compact onBack={onCancel} />
      <label className="field">
        <span>Topic</span>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="React hooks review"
          minLength={3}
          required
        />
      </label>
      <label className="field">
        <span>Date &amp; time</span>
        <input
          type="datetime-local"
          value={scheduledFor}
          min={earliest}
          onChange={(event) => setScheduledFor(event.target.value)}
          required
        />
      </label>
      {error && <p className="field-error">{error}</p>}
      <label className="field">
        <span>Location / notes (optional)</span>
        <textarea
          value={notes}
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Library study room 2, or a video call link"
        />
      </label>
      <div className="button-row">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send request"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
