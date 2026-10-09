"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Megaphone, PlayCircle, Plus, Sparkles, Trophy, X } from "lucide-react";
import { initials, timeAgo } from "@/lib/utils";

export type StorySlide = {
  id: string;
  at: string;
  kind: "leccion" | "curso" | "directo" | "anuncio" | "aviso" | "post";
  title?: string | null;
  body?: string | null;
  link?: string | null;
  cta?: string;
};

export type StoryGroup = {
  id: string;
  name: string;
  avatar?: string | null;
  brand?: boolean; // círculo con el isotipo / icono de Trud
  icon?: "clases" | "directos" | "avisos" | "resultado";
  slides: StorySlide[];
};

const DURATION = 6000;
const SEEN_KEY = "vb-stories-seen";

function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
}
function writeSeen(s: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-400))); } catch { /* sin almacenamiento: no pasa nada */ }
}

const ICONS = { clases: PlayCircle, directos: CalendarDays, avisos: Megaphone, resultado: Trophy };
const KIND_ICON = { leccion: PlayCircle, curso: BookOpen, directo: CalendarDays, anuncio: Megaphone, aviso: Sparkles, post: Trophy };

function Bubble({ g, size = 64 }: { g: StoryGroup; size?: number }) {
  if (g.brand) {
    const Icon = g.icon ? ICONS[g.icon] : Sparkles;
    return (
      <span className="grid place-items-center rounded-full bg-bg-dark text-accent" style={{ width: size, height: size }}>
        <Icon size={size * 0.4} strokeWidth={1.8} />
      </span>
    );
  }
  return g.avatar ? (
    <img src={g.avatar} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-brand-soft text-brand-deep font-semibold" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials(g.name)}
    </span>
  );
}

export function Stories({ groups, me }: { groups: StoryGroup[]; me: { name: string | null; avatar: string | null } }) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ g: number; s: number } | null>(null);

  useEffect(() => { setSeen(readSeen()); }, []);

  const groupSeen = (g: StoryGroup) => g.slides.every((s) => seen.has(s.id));
  // Primero los no vistos, como en Instagram
  const ordered = [...groups].sort((a, b) => Number(groupSeen(a)) - Number(groupSeen(b)));

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id); writeSeen(next); return next;
    });
  }, []);

  const openGroup = (gi: number) => {
    const g = ordered[gi];
    const first = g.slides.findIndex((s) => !seen.has(s.id));
    setOpen({ g: gi, s: first === -1 ? 0 : first });
  };

  return (
    <>
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-4 w-max pb-1">
          <Link href="/comunidad/resultados" className="flex flex-col items-center gap-1.5 w-[72px]">
            <span className="relative p-[3px]">
              <span className="block rounded-full p-[2px]">
                {me.avatar ? (
                  <img src={me.avatar} alt="" className="w-[62px] h-[62px] rounded-full object-cover" />
                ) : (
                  <span className="grid place-items-center w-[62px] h-[62px] rounded-full bg-bg-badge text-ink-muted font-semibold">{initials(me.name)}</span>
                )}
              </span>
              <span className="absolute bottom-0.5 right-0.5 grid place-items-center w-6 h-6 rounded-full bg-brand text-white ring-[3px] ring-bg">
                <Plus size={14} strokeWidth={2.5} />
              </span>
            </span>
            <span className="text-xs text-ink-muted truncate w-full text-center">Tu resultado</span>
          </Link>

          {ordered.map((g, i) => {
            const done = groupSeen(g);
            return (
              <button key={g.id} onClick={() => openGroup(i)} className="flex flex-col items-center gap-1.5 w-[72px]">
                <span className="rounded-full p-[3px]" style={{ background: done ? "var(--line)" : "conic-gradient(from 200deg, #c5ff5b, #16734b, #0d4f33, #c5ff5b)" }}>
                  <span className="block rounded-full p-[2px] bg-bg">
                    <Bubble g={g} size={62} />
                  </span>
                </span>
                <span className={`text-xs truncate w-full text-center ${done ? "text-ink-faint" : "text-ink"}`}>{g.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {open && (
        <Viewer
          groups={ordered}
          start={open}
          onSeen={markSeen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function Viewer({ groups, start, onSeen, onClose }: { groups: StoryGroup[]; start: { g: number; s: number }; onSeen: (id: string) => void; onClose: () => void }) {
  const [pos, setPos] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const posRef = useRef(start);
  const prog = useRef(0);
  const pausedRef = useRef(false);
  const last = useRef(0);

  const group = groups[pos.g];
  const slide = group.slides[pos.s];

  const go = useCallback((p: { g: number; s: number }) => {
    posRef.current = p; prog.current = 0; setProgress(0); setPos(p);
  }, []);

  const next = useCallback(() => {
    const p = posRef.current;
    if (p.s + 1 < groups[p.g].slides.length) go({ g: p.g, s: p.s + 1 });
    else if (p.g + 1 < groups.length) go({ g: p.g + 1, s: 0 });
    else onClose();
  }, [groups, go, onClose]);

  const prev = useCallback(() => {
    const p = posRef.current;
    if (p.s > 0) go({ g: p.g, s: p.s - 1 });
    else if (p.g > 0) go({ g: p.g - 1, s: groups[p.g - 1].slides.length - 1 });
    else go(p);
  }, [groups, go]);

  useEffect(() => { onSeen(slide.id); }, [slide.id, onSeen]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Avance automático
  useEffect(() => {
    let raf = 0;
    last.current = performance.now();
    const tick = (t: number) => {
      const dt = t - last.current;
      last.current = t;
      if (!pausedRef.current) {
        prog.current += dt / DURATION;
        if (prog.current >= 1) next();
        else setProgress(prog.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [next]);

  // Teclado y bloqueo de scroll
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; };
  }, [next, prev, onClose]);

  const Icon = KIND_ICON[slide.kind] ?? Sparkles;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm grid place-items-center fade-in" role="dialog" aria-modal="true" aria-label={`Historias de ${group.name}`}>
      <div className="on-dark relative w-full h-full sm:h-[min(88vh,780px)] sm:w-auto sm:aspect-[9/16] sm:rounded-[24px] overflow-hidden bg-[radial-gradient(120%_80%_at_20%_0%,#16734b_0%,#0c1f15_55%,#06120c_100%)] text-[#f5f4ef] select-none">
        {/* Barras de progreso */}
        <div className="absolute top-3 inset-x-3 z-20 flex gap-1">
          {group.slides.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
              <span className="block h-full bg-white" style={{ width: `${i < pos.s ? 100 : i === pos.s ? progress * 100 : 0}%` }} />
            </span>
          ))}
        </div>

        {/* Cabecera */}
        <div className="absolute top-7 inset-x-3 z-20 flex items-center gap-2.5">
          <span className="rounded-full ring-2 ring-white/20"><Bubble g={group} size={34} /></span>
          <span className="text-sm font-semibold">{group.name}</span>
          <span className="text-sm text-white/60">{timeAgo(slide.at)}</span>
          <button onClick={onClose} className="ml-auto grid place-items-center w-9 h-9 rounded-full hover:bg-white/10" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        {/* Zonas de toque: izquierda atrás, derecha adelante; mantener pulsado pausa */}
        <div
          className="absolute inset-0 z-10 grid grid-cols-[1fr_2fr]"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          <button aria-label="Anterior" onClick={prev} />
          <button aria-label="Siguiente" onClick={next} />
        </div>

        {/* Contenido */}
        <div className="absolute inset-0 flex flex-col justify-center px-7 pt-20 pb-28 pointer-events-none">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-accent text-ink mb-6">
            <Icon size={26} strokeWidth={1.9} />
          </span>
          {slide.title && <p className="text-[28px] leading-[1.12] font-semibold tracking-[-0.03em]">{slide.title}</p>}
          {slide.body && (
            <p className={`mt-4 whitespace-pre-line break-words ${slide.title ? "text-white/75 text-[17px] line-clamp-[8]" : "text-[22px] leading-snug font-medium line-clamp-[12]"}`}>
              {slide.body}
            </p>
          )}
        </div>

        {slide.link && (
          <div className="absolute bottom-6 inset-x-6 z-20">
            <Link href={slide.link} onClick={onClose} className="btn bg-accent text-ink w-full justify-center">
              {slide.cta ?? "Ver"} <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
