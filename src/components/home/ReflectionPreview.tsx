import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import Avatar from "@/components/ui/Avatar";
import type { PostType } from "@/types";

const PROMPT_PREFIX = /^Reflecting on: "([\s\S]*?)"\n\n/;

/** Split the stored "Reflecting on" prefix from the body for display. */
export function splitPrompt(text: string) {
  const match = text.match(PROMPT_PREFIX);
  return match ? { prompt: match[1], body: text.slice(match[0].length) } : { prompt: null, body: text };
}

type Author = { name?: string; username?: string; image?: string; firebaseId?: string };

/** Read-only, server-rendered reflection card for the guest home preview. */
export default function ReflectionPreview({ post }: { post: PostType }) {
  const author = (post.userId || {}) as Author;
  const { prompt, body } = splitPrompt(post.text || "");
  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  return (
    <article className="relative rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <header className="flex items-center gap-3">
        <Avatar src={author.image} name={author.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-caption font-semibold text-foreground">{author.name || "MindFuel member"}</p>
          <p className="truncate text-micro text-muted-foreground">
            {author.username ? `@${author.username}` : null}
            {createdAt ? (
              <>
                {author.username ? " · " : null}
                <time dateTime={createdAt.toISOString()}>{formatDistanceToNowStrict(createdAt, { addSuffix: true })}</time>
              </>
            ) : null}
          </p>
        </div>
      </header>
      {prompt ? <p className="mt-3 text-caption text-muted-foreground">On “{prompt}”</p> : null}
      <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-body-sm text-foreground">{body}</p>
      <Link href={`/post/${post._id}`} className="mt-3 inline-block text-caption font-semibold text-primary-text after:absolute after:inset-0 after:content-['']">
        Read reflection<span className="sr-only"> by {author.name || "a member"}</span>
      </Link>
    </article>
  );
}
