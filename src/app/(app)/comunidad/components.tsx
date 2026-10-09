"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Heart, Pin, Send, SmilePlus, Trash2 } from "lucide-react";
import { REACTIONS, groupReactions, type Reaction } from "@/lib/reactions";
import { createComment, createPost, deleteComment, deletePost, toggleLike, togglePin, toggleReaction } from "./actions";

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

export function Reactions({ postId, rows, me }: { postId: string; rows: Reaction[]; me: string }) {
  const [list, setList] = useState(rows);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function toggle(emoji: string) {
    const on = !list.some((r) => r.emoji === emoji && r.user_id === me);
    const prev = list;
    setList(on ? [...list, { emoji, user_id: me }] : list.filter((r) => !(r.emoji === emoji && r.user_id === me)));
    setOpen(false);
    start(async () => { const r = await toggleReaction(postId, emoji, on); if (r.error) setList(prev); });
  }

  const groups = groupReactions(list, me);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map((g) => (
        <button key={g.emoji} onClick={() => toggle(g.emoji)} aria-pressed={g.mine}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm tabular-nums transition-colors ${g.mine ? "border-brand bg-accent-soft text-brand-deep" : "border-line text-ink-muted hover:border-ink-faint"}`}>
          <span className="text-[15px] leading-none">{g.emoji}</span>{g.count}
        </button>
      ))}
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(!open)} title="Reaccionar" aria-label="Reaccionar" aria-expanded={open}
          className="grid place-items-center w-7 h-7 rounded-full text-ink-muted hover:text-ink hover:bg-bg-badge">
          <SmilePlus size={16} />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-2 z-20 flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-lg fade-in">
            {REACTIONS.map((e) => {
              const mine = list.some((r) => r.emoji === e && r.user_id === me);
              return (
                <button key={e} onClick={() => toggle(e)} aria-label={`Reaccionar con ${e}`}
                  className={`w-9 h-9 rounded-full text-xl leading-none transition-transform hover:scale-125 ${mine ? "bg-accent-soft" : ""}`}>{e}</button>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
