"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Pin, Send, Trash2 } from "lucide-react";
import { createComment, createPost, deleteComment, deletePost, toggleLike, togglePin } from "./actions";

export function Composer({ channelId, placeholder, wins }: { channelId: string; placeholder: string; wins: boolean }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="card p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createPost(channelId, body);
          if (res.error) { setError(res.error); return; }
          setBody(""); setError(null);
          setFlash(wins ? "+50 pts · Resultado publicado" : "+3 pts");
          setTimeout(() => setFlash(null), 1800);
          router.refresh();
        });
      }}
    >
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} className="w-full bg-transparent outline-none resize-none min-h-20 text-[15px]" />
      <div className="flex items-center justify-between">
        <span className="text-sm text-red-700">{error}</span>
        <div className="flex items-center gap-3">
          {flash && <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold fade-in">{flash}</span>}
          <button className="btn btn-dark !py-2" disabled={pending || !body.trim()}><Send size={15} /> Publicar</button>
        </div>
      </div>
    </form>
  );
}

export function LikeButton({ postId, count, liked }: { postId: string; count: number; liked: boolean }) {
  const [state, setState] = useState({ count, liked });
  const [, start] = useTransition();
  return (
    <button
      onClick={() => {
        const next = !state.liked;
        setState({ liked: next, count: state.count + (next ? 1 : -1) });
        start(async () => { await toggleLike(postId, next); });
      }}
      className={`flex items-center gap-1.5 text-sm ${state.liked ? "text-brand" : "text-ink-muted hover:text-ink"}`}
      aria-pressed={state.liked}
    >
      <Heart size={16} fill={state.liked ? "currentColor" : "none"} /> {state.count}
    </button>
  );
}

export function PostAdmin({ postId, canDelete, canPin, pinned, redirectTo }: { postId: string; canDelete: boolean; canPin: boolean; pinned: boolean; redirectTo?: string }) {
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      {canPin && (
        <button title={pinned ? "Desfijar" : "Fijar"} className={pinned ? "text-brand" : "text-ink-faint hover:text-ink"} onClick={() => start(async () => { await togglePin(postId, !pinned); router.refresh(); })}>
          <Pin size={15} />
        </button>
      )}
      {canDelete && (
        <button title="Borrar" className="text-ink-faint hover:text-red-700" onClick={() => {
          if (!confirm("¿Borrar esta publicación?")) return;
          start(async () => { await deletePost(postId); if (redirectTo) router.push(redirectTo); else router.refresh(); });
        }}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createComment(postId, body);
          if (!res.error) { setBody(""); router.refresh(); }
        });
      }}
    >
      <input className="input" placeholder="Escribe un comentario…" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn btn-dark shrink-0" disabled={pending || !body.trim()}><Send size={15} /></button>
    </form>
  );
}

export function DeleteComment({ id, postId }: { id: string; postId: string }) {
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <button className="text-ink-faint hover:text-red-700" title="Borrar" onClick={() => {
      if (!confirm("¿Borrar comentario?")) return;
      start(async () => { await deleteComment(id, postId); router.refresh(); });
    }}>
      <Trash2 size={13} />
    </button>
  );
}
