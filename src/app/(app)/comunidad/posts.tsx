import Link from "next/link";
import { MessageCircle, Paperclip, Pin } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import { LikeButton, PostAdmin, Reactions } from "./components";

export type PostRow = {
  id: string; body: string; pinned: boolean; created_at: string; author_id: string;
  author: { id: string; full_name: string | null; avatar_url: string | null; role: string } | null;
  post_likes: { user_id: string }[];
  post_reactions: { user_id: string; emoji: string }[];
  comments: { count: number }[];
  legacy_author?: LegacyAuthor | null;
  media?: Media[] | null;
  legacy_likes?: number | null;
};

export type LegacyAuthor = { name: string; avatar?: string | null; contact_id?: string | null };
export type Media = { url: string; type: string; name?: string | null; width?: number | null; height?: number | null };

/** Autor a mostrar: el perfil si existe; si no, el autor original migrado de la comunidad antigua. */
export function shownAuthor(a: { id: string; full_name: string | null; avatar_url: string | null; role?: string } | null | undefined, legacy?: LegacyAuthor | null) {
  if (a) return { id: a.id as string | null, name: a.full_name || "Miembro", avatar: a.avatar_url, staff: !!a.role && a.role !== "alumno" };
  return { id: null, name: legacy?.name || "Miembro", avatar: legacy?.avatar ?? null, staff: false };
}

/* eslint-disable @next/next/no-img-element */
export function MediaGrid({ media }: { media?: Media[] | null }) {
  if (!media?.length) return null;
  const visual = media.filter((m) => m.type.startsWith("image/") || m.type.startsWith("video/"));
  const files = media.filter((m) => !visual.includes(m));
  return (
    <div className="space-y-2">
      {visual.length > 0 && (
        <div className={`grid gap-2 ${visual.length > 1 ? "grid-cols-2" : ""}`}>
          {visual.map((m) => m.type.startsWith("video/") ? (
            <video key={m.url} src={m.url} controls playsInline preload="metadata" className="w-full max-h-[520px] rounded-[14px] bg-black" />
          ) : (
            <a key={m.url} href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" loading="lazy" className="w-full max-h-[520px] object-cover rounded-[14px] bg-bg-badge" /></a>
          ))}
        </div>
      )}
      {files.map((m) => (
        <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-bg-badge px-3 py-1.5 text-sm hover:text-brand max-w-full">
          <Paperclip size={14} className="shrink-0" /><span className="truncate">{m.name || "Archivo"}</span>
        </a>
      ))}
    </div>
  );
}

export const POST_SELECT = "id,body,pinned,created_at,author_id,author:profiles!posts_author_id_fkey(id,full_name,avatar_url,role),post_likes(user_id),post_reactions(user_id,emoji),comments(count),legacy_author,media,legacy_likes";

export function PostCard({ p, me, staff, full = false }: { p: PostRow; me: string; staff: boolean; full?: boolean }) {
  const comments = p.comments?.[0]?.count ?? 0;
  const au = shownAuthor(p.author, p.legacy_author);
  const head = (
    <>
      <Avatar name={au.name} url={au.avatar} size={40} />
      <div>
        <p className="font-medium leading-tight flex items-center gap-2">
          {au.name}
          {au.staff && <span className="badge !py-0.5 !text-[10px] !bg-brand !text-white">Equipo</span>}
        </p>
        <p className="text-xs text-ink-faint">{timeAgo(p.created_at)}</p>
      </div>
    </>
  );
  return (
    <article className="card p-5 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        {au.id ? <Link href={`/miembros/${au.id}`} className="flex items-center gap-3">{head}</Link> : <div className="flex items-center gap-3">{head}</div>}
        <div className="flex items-center gap-3">
          {p.pinned && <Pin size={15} className="text-brand" />}
          <PostAdmin postId={p.id} canDelete={staff || p.author_id === me} canPin={staff} pinned={p.pinned} redirectTo={full ? "/comunidad" : undefined} />
        </div>
      </header>
      <p className={`whitespace-pre-line text-[15px] leading-relaxed break-words ${full ? "" : "line-clamp-[12]"}`}>{p.body}</p>
      <MediaGrid media={p.media} />
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
        <LikeButton postId={p.id} count={p.post_likes.length + (p.legacy_likes ?? 0)} liked={p.post_likes.some((l) => l.user_id === me)} />
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
