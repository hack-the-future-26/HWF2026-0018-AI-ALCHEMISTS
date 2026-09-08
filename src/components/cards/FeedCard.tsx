import { postCta } from "../../constants/navigation";
import { formatRelative, type PostRow } from "../../lib/peerspace";
import { Avatar } from "../ui/Avatar";
import { SkillTag } from "../ui/SkillTag";
import { VerifiedBadge } from "../ui/VerifiedBadge";

export function FeedCard({
  post,
  currentUserId,
  onRespond
}: {
  post: PostRow;
  currentUserId: string;
  onRespond: (post: PostRow) => void;
}) {
  const isOwnPost = post.author.id === currentUserId;

  return (
    <article className="feed-card card">
      <header>
        <Avatar peer={post.author} />
        <div>
          <div className="identity-line">
            <strong>{post.author.name}</strong>
            <VerifiedBadge />
            <time>{formatRelative(post.createdAt)}</time>
          </div>
          <span className="tag">{post.tag}</span>
        </div>
      </header>
      <p>{post.body}</p>
      <div className="tag-cloud">
        {post.skills.map((skill) => (
          <SkillTag key={skill} label={skill} />
        ))}
      </div>
      {isOwnPost ? (
        <span className="tag">Your post</span>
      ) : (
        <button className="btn btn-secondary" onClick={() => onRespond(post)}>
          {postCta[post.tag] ?? "Join discussion"}
        </button>
      )}
    </article>
  );
}
