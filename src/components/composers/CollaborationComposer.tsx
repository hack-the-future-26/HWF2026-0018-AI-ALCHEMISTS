import { FormEvent, useState } from "react";
import type { NewCollaborationInput } from "../../types/app";
import { SectionHeader } from "../ui/SectionHeader";

export function CollaborationComposer({
  onSubmit,
  onCancel
}: {
  onSubmit: (input: NewCollaborationInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [meetingWindow, setMeetingWindow] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      meetingWindow: meetingWindow.trim()
    });
  }

  return (
    <form className="card create-form" onSubmit={handleSubmit}>
      <SectionHeader label="Post a collaboration request" compact />
      <label className="field">
        <span>Project title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Campus accessibility map"
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          value={description}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Map quiet entrances, ramps, and elevator reliability for student services."
        />
      </label>
      <label className="field">
        <span>Skills needed (comma separated)</span>
        <input
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="React, Figma"
        />
      </label>
      <label className="field">
        <span>Meeting window</span>
        <input
          value={meetingWindow}
          onChange={(event) => setMeetingWindow(event.target.value)}
          placeholder="Wednesdays, 5 PM"
        />
      </label>
      <div className="button-row">
        <button className="btn btn-primary" type="submit">
          Post request
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
