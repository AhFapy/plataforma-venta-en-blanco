"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Heart, Pin, Send, Trash2 } from "lucide-react";
import { createComment, createPost, deleteComment, deletePost, toggleLike, togglePin } from "./actions";

export function Composer({ channelId, placeholder, wins, trustpilotUrl = null }: { channelId: string; placeholder: string; wins: boolean; trustpilotUrl?: string | null }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
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
          if (wins && trustpilotUrl) setCelebrate(true);
          setTimeout(() => setFlash(null), 1800);
          router.refresh();
        });
      }}
    >
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} className="w-full bg-transparent outline-none resize-none min-h-20 text-[15px]" />
      <div className="flex items-center justify-between">
        <span className="text-sm text-red-700">{error}</span>
        <div className="flex items-center gap-3">
          {flash && <span className="rounded-full bg-accent text-on-accent px-3 py-1 text-sm font-semibold fade-in">{flash}</span>}
          <button className="btn btn-dark !py-2" disabled={pending || !body.trim()}><Send size={15} /> Publicar</button>
        </div>
      </div>
      {celebrate && trustpilotUrl && <TrustpilotModal url={trustpilotUrl} onClose={() => setCelebrate(false)} />}
    </form>
  );
}

function TrustpilotModal({ url, onClose }: { url: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 backdrop-blur-sm p-4 fade-in" role="dialog" aria-modal="true" aria-label="Valora Trud Sales">
      <div className="w-full max-w-md feed-card p-7 text-center space-y-4">
        <p className="text-5xl" aria-hidden>🏆</p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Enhorabuena por tu <span className="em">resultado.</span></h2>
        <p className="text-ink-muted">Si la formación te está ayudando, cuéntalo en Trustpilot. Le sirve a la próxima persona que esté dudando, como dudaste tú.</p>
        <div className="flex flex-col gap-2 pt-2">
          <a href={url} target="_blank" rel="noreferrer" onClick={onClose} className="btn btn-brand justify-center">Dejar mi opinión en Trustpilot</a>
          <button type="button" onClick={onClose} className="btn btn-ghost justify-center">Ahora no</button>
        </div>
      </div>
    </div>,
    document.body
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
