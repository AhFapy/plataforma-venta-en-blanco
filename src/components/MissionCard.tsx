"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { Check, ExternalLink, Camera, MonitorPlay, LayoutGrid, Sparkles } from "lucide-react";
import { completeMission } from "@/app/(app)/mission-actions";

type M = { id: string; category: string; title: string; description: string | null; image_url: string | null; link: string | null; cta: string | null; points: number; done: boolean };

function iconFor(m: M) {
  const l = (m.link ?? "").toLowerCase();
  if (l.includes("instagram")) return Camera;
  if (l.includes("youtu")) return MonitorPlay;
  return m.category === "apps" ? LayoutGrid : Sparkles;
}

export function MissionCard({ m, big = false }: { m: M; big?: boolean }) {
  const [done, setDone] = useState(m.done);
  const [opened, setOpened] = useState(false);
  const [pending, start] = useTransition();
  const Icon = iconFor(m);

  return (
    <article className={`feed-card overflow-hidden flex flex-col ${done ? "opacity-80" : ""}`}>
      {big && m.image_url && <img src={m.image_url} alt="" className="w-full aspect-[16/9] object-cover" />}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          {!(big && m.image_url) && (
            <span className="grid place-items-center w-11 h-11 rounded-2xl bg-bg-dark text-accent shrink-0"><Icon size={20} /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{m.title}</p>
            {m.description && <p className="text-sm text-ink-muted mt-0.5">{m.description}</p>}
          </div>
          {m.points > 0 && <span className="badge !bg-accent-soft !text-brand-deep shrink-0">+{m.points} pts</span>}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {done ? (
            <span className="btn btn-ghost !py-2 !cursor-default"><Check size={15} /> Completado</span>
          ) : (
            <>
              {m.link ? (
                <a href={m.link} target="_blank" rel="noreferrer" onClick={() => setOpened(true)} className="btn btn-dark !py-2">
                  {m.cta || "Abrir"} <ExternalLink size={14} />
                </a>
              ) : (
                <span className="text-sm text-ink-faint self-center">Enlace disponible muy pronto</span>
              )}
              {m.points > 0 && m.link && (
                <button
                  disabled={!opened || pending}
                  onClick={() => start(async () => { const r = await completeMission(m.id); if (!r.error) setDone(true); })}
                  className="btn btn-brand !py-2"
                  title={opened ? "" : "Primero abre el enlace"}
                >
                  {pending ? "Guardando…" : "Ya lo he hecho"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
