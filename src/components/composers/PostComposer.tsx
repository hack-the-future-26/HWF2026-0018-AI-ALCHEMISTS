import { FormEvent, useState } from "react";
import type { NewPostInput } from "../../types/app";
import { SectionHeader } from "../ui/SectionHeader";

export function PostComposer({
  onSubmit,
  onCancel
}: {
  onSubmit: (input: NewPostInput) => void;
  onCancel: () => void;
}) {
  const [tag, setTag] = useState("Peer group");
  const [body, setBody] = useState("");
  const [skills, setSkills] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    onSubmit({
      tag,
      body: body.trim(),
      skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    });
  }

  return (
    <form className="card create-form" onSubmit={handleSubmit}>
      <SectionHeader label="Share an update" compact onBack={onCancel} />
      <label className="field">
        <span>Post type</span>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          <option>Peer group</option>
          <option>Study pod</option>
          <option>Teammate ask</option>
          <option>Other</option>
        </select>
      </label>
      <label className="field">
        <span>What do you need or want to share?</span>
        <textarea
          value={body}
          rows={3}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Opening a small critique room for anyone turning course projects into case studies."
        />
      </label>
      <label className="field">
        <span>Related skills (comma separated)</span>
        <input
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="Figma, UI Design"
        />
      </label>
      <div className="button-row">
        <button className="btn btn-primary" type="submit">
          Post
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
