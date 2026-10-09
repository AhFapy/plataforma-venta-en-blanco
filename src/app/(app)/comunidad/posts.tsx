import Link from "next/link";
import { MessageCircle, Pin } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import { LikeButton, PostAdmin, Reactions } from "./components";

export type PostRow = {
  id: string; body: string; pinned: boolean; created_at: string; author_id: string;
  author: { id: string; full_name: string | null; avatar_url: string | null; role: string } | null;
  post_likes: { user_id: string }[];
  post_reactions: { user_id: string; emoji: string }[];
  comments: { count: number }[];
};

export const POST_SELECT = "id,body,pinned,created_at,author_id,author:profiles!posts_author_id_fkey(id,full_name,avatar_url,role),post_likes(user_id),post_reactions(user_id,emoji),comments(count)";

export function PostCard({ p, me, staff, full = false }: { p: PostRow; me: string; staff: boolean; full?: boolean }) {
  const comments = p.comments?.[0]?.count ?? 0;
  return (
    <article className="card p-5 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <Link href={`/miembros/${p.author?.id}`} className="flex items-center gap-3">
          <Avatar name={p.author?.full_name} url={p.author?.avatar_url} size={40} />
          <div>
            <p className="font-medium leading-tight flex items-center gap-2">
              {p.author?.full_name || "Miembro"}
              {p.author && p.author.role !== "alumno" && <span className="badge !py-0.5 !text-[10px] !bg-brand !text-white">Equipo</span>}
            </p>
            <p className="text-xs text-ink-faint">{timeAgo(p.created_at)}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {p.pinned && <Pin size={15} className="text-brand" />}
          <PostAdmin postId={p.id} canDelete={staff || p.author_id === me} canPin={staff} pinned={p.pinned} redirectTo={full ? "/comunidad" : undefined} />
        </div>
      </header>
      <p className={`whitespace-pre-line text-[15px] leading-relaxed break-words ${full ? "" : "line-clamp-[12]"}`}>{p.body}</p>
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
        <LikeButton postId={p.id} count={p.post_likes.length} liked={p.post_likes.some((l) => l.user_id === me)} />
        <Reactions postId={p.id} rows={p.post_reactions ?? []} me={me} />
        {!full && (
          <Link href={`/comunidad/post/${p.id}`} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <MessageCircle size={16} /> {comments} {comments === 1 ? "comentario" : "comentarios"}
          </Link>
        )}
      </footer>
    </article>
  );
}
