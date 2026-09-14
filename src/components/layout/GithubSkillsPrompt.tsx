import { SkillTag } from "../ui/SkillTag";

export function GithubSkillsPrompt({
  skills,
  onAccept,
  onEdit
}: {
  skills: string[];
  onAccept: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="profile-prompt github-skills-prompt">
      <div className="github-skills-copy">
        <span>We found these skills from your GitHub — want to add them to your profile?</span>
        <div className="tag-cloud">
          {skills.map((skill) => (
            <SkillTag key={skill} label={skill} />
          ))}
        </div>
      </div>
      <div className="profile-prompt-actions">
        <button className="btn btn-primary" type="button" onClick={onAccept}>
          Accept
        </button>
        <button className="btn btn-secondary" type="button" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
