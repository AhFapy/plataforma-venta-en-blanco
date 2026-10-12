"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { markConversationRead, sendDm } from "@/app/social-actions";
import { timeAgo } from "@/lib/utils";

export type ThreadMsg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null; story_media_url: string | null; story_media_type: string | null };

export function Thread({ me, to, conversationId, messages, canSend }: { me: string; to: string; conversationId: string | null; messages: ThreadMsg[]; canSend: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<ThreadMsg[]>([]);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const all = [...messages, ...optimistic];
  // Cuando llegan los mensajes del servidor, sobran los provisionales
  useEffect(() => { setOptimistic([]); }, [messages.length]);

  // Marcar como leído y refrescar cada pocos segundos mientras la conversación está abierta
  const unread = messages.some((m) => m.sender_id !== me && !m.read_at);
  useEffect(() => { if (conversationId && unread) markConversationRead(conversationId).then(() => router.refresh()); }, [conversationId, unread, router]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 5000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [all.length]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText(""); setError(null);
    setOptimistic((o) => [...o, { id: `tmp-${Date.now()}`, sender_id: me, body, created_at: new Date().toISOString(), read_at: null, story_media_url: null, story_media_type: null }]);
    start(async () => {
      const r = await sendDm(to, body);
      if (r.error) { setError(r.error); setText(body); setOptimistic([]); return; }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto py-4 space-y-2 overscroll-contain">
        {all.length === 0 && <p className="text-center text-sm text-ink-muted py-10">Escribe el primer mensaje.</p>}
        {all.map((m, i) => {
          const mine = m.sender_id === me;
          const showTime = i === all.length - 1 || all[i + 1].sender_id !== m.sender_id;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {m.story_media_url && (
                <div className={`mb-1 flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-ink-faint mb-1">{mine ? "Respondiste a su historia" : "Respondió a tu historia"}</span>
                  {m.story_media_type === "video"
                    ? <video src={m.story_media_url} muted playsInline preload="metadata" className="w-24 h-40 rounded-[12px] object-cover bg-black" />
                    : <img src={m.story_media_url} alt="" className="w-24 h-40 rounded-[12px] object-cover bg-bg-badge" />}
                </div>
              )}
              <p className={`max-w-[80%] whitespace-pre-line break-words rounded-[18px] px-4 py-2.5 text-[15px] ${mine ? "bg-ink text-bg rounded-br-[6px]" : "bg-bg-badge text-ink rounded-bl-[6px]"} ${m.id.startsWith("tmp-") ? "opacity-60" : ""}`}>{m.body}</p>
              {showTime && <span className="text-[11px] text-ink-faint mt-1">{timeAgo(m.created_at)}{mine && i === all.length - 1 && m.read_at ? " · Visto" : ""}</span>}
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {canSend ? (
        <form onSubmit={send} className="flex items-end gap-2 pt-3 border-t border-line">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="Escribe un mensaje…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
            className="input flex-1 resize-none max-h-32 !py-2.5" />
          <button className="btn btn-dark !px-4 !py-2.5" disabled={pending || !text.trim()} aria-label="Enviar"><Send size={16} /></button>
        </form>
      ) : <p className="text-sm text-ink-muted pt-3 border-t border-line">Esta persona ya no tiene acceso a la plataforma.</p>}
      {error && <p className="text-sm text-red-700 pt-1">{error}</p>}
    </>
  );
}
