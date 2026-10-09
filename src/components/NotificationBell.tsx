"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markNotificationsSeen } from "@/app/notification-actions";
import { timeAgo } from "@/lib/utils";
import { NotificationIcon } from "./NotificationIcon";

type Item = { id: string; kind: "leccion" | "curso" | "directo" | "anuncio" | "aviso"; title: string; body: string | null; link: string | null; created_at: string };

export function NotificationBell({ items, seenAt, align = "right" }: { items: Item[]; seenAt: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const seen = new Date(seenAt).getTime();
  const unread = cleared ? 0 : items.filter((i) => new Date(i.created_at).getTime() > seen).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setCleared(true);
      start(async () => { await markNotificationsSeen(); });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`} className="relative grid place-items-center w-10 h-10 rounded-full hover:bg-bg-badge transition-colors">
        <Bell size={20} strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-semibold grid place-items-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute z-50 mt-2 w-[min(360px,calc(100vw-32px))] feed-card shadow-[0_12px_40px_-12px_rgba(12,31,21,.25)] overflow-hidden fade-in ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="font-semibold">Notificaciones</p>
            <Link href="/" onClick={() => setOpen(false)} className="text-sm text-brand">Ver todo</Link>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto pb-2">
            {items.length === 0 && <li className="px-4 py-6 text-sm text-ink-muted">Aún no hay novedades.</li>}
            {items.map((n) => {
              const isNew = new Date(n.created_at).getTime() > seen;
              const inner = (
                <div className={`flex gap-3 px-4 py-3 hover:bg-bg ${isNew ? "bg-brand-soft/40" : ""}`}>
                  <NotificationIcon kind={n.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug"><span className="font-medium">{n.title}</span></p>
                    {n.body && <p className="text-sm text-ink-muted line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-ink-faint mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              );
              return <li key={n.id}>{n.link ? <Link href={n.link} onClick={() => setOpen(false)}>{inner}</Link> : inner}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
