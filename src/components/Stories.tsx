"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Heart, Megaphone, Pause, Play, PlayCircle, Plus, Send, Sparkles, Trash2, Trophy, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import { createComment, toggleLike } from "@/app/(app)/comunidad/actions";
import { initials, timeAgo } from "@/lib/utils";
import { StoryComposer } from "./StoryComposer";
import { deleteStory } from "@/app/story-actions";
import { useRouter } from "next/navigation";

export type StorySlide = {
  id: string;
  at: string;
  kind: "leccion" | "curso" | "directo" | "anuncio" | "aviso" | "post" | "story";
  title?: string | null;
  body?: string | null;
  link?: string | null;
  cta?: string;
  postId?: string;   // historias de alumnos: permite responder (comentario) y dar like
  liked?: boolean;
  media?: { url: string; type: "image" | "video" }; // historias subidas por alumnos
  storyId?: string;
  mine?: boolean;
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
const KIND_ICON = { leccion: PlayCircle, curso: BookOpen, directo: CalendarDays, anuncio: Megaphone, aviso: Sparkles, post: Trophy, story: Sparkles };

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

export function Stories({ groups, mine, me }: { groups: StoryGroup[]; mine: StoryGroup | null; me: { id: string; name: string | null; avatar: string | null } }) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ g: number; s: number } | null>(null);
  const [composer, setComposer] = useState(false);

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

  // La propia historia va primero en el visor, como en Instagram
  const all = mine ? [mine, ...ordered] : ordered;
  const offset = mine ? 1 : 0;
  const openGroup = (gi: number) => {
    const g = all[gi];
    const first = g.slides.findIndex((s) => !seen.has(s.id));
    setOpen({ g: gi, s: first === -1 ? 0 : first });
  };
  const mineSeen = mine ? groupSeen(mine) : true;

  return (
    <>
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-4 w-max pb-1">
          <div className="flex flex-col items-center gap-1.5 w-[72px]">
            <span className="relative">
              <button
                onClick={() => (mine ? openGroup(0) : setComposer(true))}
                className="block rounded-full p-[3px]"
                style={{ background: mine ? (mineSeen ? "var(--line)" : "conic-gradient(from 200deg, #c5ff5b, #16734b, #0d4f33, #c5ff5b)") : "transparent" }}
                aria-label={mine ? "Ver tu historia" : "Subir una historia"}
              >
                <span className="block rounded-full p-[2px] bg-bg">
                  {me.avatar ? (
                    <img src={me.avatar} alt="" className="w-[62px] h-[62px] rounded-full object-cover" />
                  ) : (
                    <span className="grid place-items-center w-[62px] h-[62px] rounded-full bg-bg-badge text-ink-muted font-semibold">{initials(me.name)}</span>
                  )}
                </span>
              </button>
              <button onClick={() => setComposer(true)} className="absolute bottom-0.5 right-0.5 grid place-items-center w-6 h-6 rounded-full bg-brand text-white ring-[3px] ring-bg" aria-label="Añadir a tu historia">
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </span>
            <span className="text-xs text-ink-muted truncate w-full text-center">Tu historia</span>
          </div>

          {ordered.map((g, i) => {
            const done = groupSeen(g);
            return (
              <button key={g.id} onClick={() => openGroup(i + offset)} className="flex flex-col items-center gap-1.5 w-[72px]">
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

      {open && typeof document !== "undefined" && createPortal(
        <Viewer
          groups={all}
          start={open}
          onSeen={markSeen}
          onClose={() => setOpen(null)}
        />,
        document.body
      )}
      {composer && <StoryComposer userId={me.id} onClose={() => setComposer(false)} />}
    </>
  );
}

const BG = "radial-gradient(120% 80% at 20% 0%, #16734b 0%, #0c1f15 55%, #06120c 100%)";

/** Texto de la historia. compact = versión pequeña para las previas laterales. */
function SlideBody({ slide, compact = false }: { slide: StorySlide; compact?: boolean }) {
  const Icon = KIND_ICON[slide.kind] ?? Sparkles;
  return (
    <div className={`absolute inset-0 flex flex-col justify-center ${compact ? "px-4" : "px-7 pt-24 pb-32"}`}>
      <span className={`grid place-items-center rounded-2xl bg-accent text-on-accent ${compact ? "w-8 h-8 mb-3 rounded-xl" : "w-14 h-14 mb-6"}`}>
        <Icon size={compact ? 16 : 26} strokeWidth={1.9} />
      </span>
      {slide.title && <p className={`font-semibold tracking-[-0.03em] ${compact ? "text-sm leading-tight line-clamp-3" : "text-[28px] leading-[1.12]"}`}>{slide.title}</p>}
      {slide.body && (
        <p className={`whitespace-pre-line break-words ${compact ? "mt-2 text-xs text-white/70 line-clamp-4" : slide.title ? "mt-4 text-white/75 text-[17px] line-clamp-[8]" : "text-[22px] leading-snug font-medium line-clamp-[12]"}`}>
          {slide.body}
        </p>
      )}
    </div>
  );
}

function SidePreview({ g, onClick, far = false }: { g: StoryGroup; onClick: () => void; far?: boolean }) {
  const slide = g.slides[0];
  return (
    <button onClick={onClick} className={`relative shrink-0 h-[40vh] max-h-[380px] aspect-[9/16] rounded-[10px] overflow-hidden text-[#f5f4ef] group ${far ? "hidden min-[1680px]:block" : ""}`} style={{ background: BG }} aria-label={`Ver historias de ${g.name}`}>
      {slide.media?.type === "image" ? (
        <img src={slide.media.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : slide.media?.type === "video" ? (
        <video src={slide.media.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 opacity-30 blur-[3px] scale-105"><SlideBody slide={slide} compact /></div>
      )}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="rounded-full p-[3px]" style={{ background: "conic-gradient(from 200deg, #c5ff5b, #16734b, #0d4f33, #c5ff5b)" }}>
          <span className="block rounded-full p-[2px] bg-[#1a1a1a]"><Bubble g={g} size={58} /></span>
        </span>
        <span className="text-[15px] font-semibold drop-shadow">{g.name}</span>
        <span className="text-sm text-white/80 drop-shadow">{timeAgo(slide.at)}</span>
      </div>
    </button>
  );
}

function Viewer({ groups, start, onSeen, onClose }: { groups: StoryGroup[]; start: { g: number; s: number }; onSeen: (id: string) => void; onClose: () => void }) {
  const [pos, setPos] = useState(start);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const posRef = useRef(start);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const router = useRouter();
  const prog = useRef(0);
  const stopped = useRef(false);
  const last = useRef(0);

  const group = groups[pos.g];
  const slide = group.slides[pos.s];
  const liked = slide.postId ? likes[slide.postId] ?? !!slide.liked : false;
  const isVideo = slide.media?.type === "video";
  const isVideoRef = useRef(isVideo);
  isVideoRef.current = isVideo;

  const go = useCallback((p: { g: number; s: number }) => {
    posRef.current = p; prog.current = 0; setProgress(0); setPos(p); setReply(""); setSent(null);
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
  useEffect(() => {
    stopped.current = paused || holding || typing;
    const v = videoRef.current;
    if (v) { if (stopped.current) v.pause(); else v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); }); }
  }, [paused, holding, typing, slide.id]);

  async function removeStory() {
    if (!slide.storyId || !confirm("¿Eliminar esta historia?")) return;
    await deleteStory(slide.storyId);
    onClose();
    router.refresh();
  }

  // Avance automático
  useEffect(() => {
    let raf = 0;
    last.current = performance.now();
    const tick = (t: number) => {
      const dt = t - last.current;
      last.current = t;
      // Los vídeos llevan su propio ritmo (timeupdate)
      if (!stopped.current && !isVideoRef.current) {
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
      if ((e.target as HTMLElement)?.tagName === "INPUT") { if (e.key === "Escape") (e.target as HTMLElement).blur(); return; }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") { e.preventDefault(); setPaused((v) => !v); }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; };
  }, [next, prev, onClose]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!slide.postId || !reply.trim()) return;
    const text = reply;
    setReply("");
    const r = await createComment(slide.postId, text);
    setSent(r.error ? "No se ha podido enviar" : "Respuesta enviada");
    (document.activeElement as HTMLElement)?.blur();
  }

  function like() {
    if (!slide.postId) return;
    const v = !liked;
    setLikes((l) => ({ ...l, [slide.postId!]: v }));
    toggleLike(slide.postId, v);
  }

  const before = groups.slice(Math.max(0, pos.g - 2), pos.g).map((g, i, arr) => ({ g, idx: pos.g - arr.length + i }));
  const after = groups.slice(pos.g + 1, pos.g + 3).map((g, i) => ({ g, idx: pos.g + 1 + i }));
  const canPrev = pos.g > 0 || pos.s > 0;

  return (
    <div className="on-dark fixed inset-0 z-[100] bg-[#1a1a1a] text-[#f5f4ef] fade-in" role="dialog" aria-modal="true" aria-label={`Historias de ${group.name}`}>
      {/* Marca y cerrar (escritorio) */}
      <div className="hidden lg:flex absolute top-5 left-6 items-center gap-2.5 z-30">
        <span className="grid place-items-center w-8 h-8 rounded-[9px] bg-bg-dark"><Image src="/isotipo.png" alt="" width={20} height={15} /></span>
        <span className="text-[20px] font-semibold tracking-[-0.03em]">Trud <span className="em">Sales.</span></span>
      </div>
      <button onClick={onClose} className="hidden lg:grid absolute top-4 right-5 z-30 place-items-center w-11 h-11 rounded-full hover:bg-white/10" aria-label="Cerrar">
        <X size={30} strokeWidth={1.6} />
      </button>

      <div className="h-full flex items-center justify-center lg:gap-14">
        {/* Previas anteriores */}
        <div className="hidden lg:flex gap-14 items-center justify-end flex-1">
          {before.map(({ g, idx }) => <SidePreview key={g.id} g={g} far={idx < pos.g - 1} onClick={() => go({ g: idx, s: 0 })} />)}
        </div>

        <div className="relative flex items-center lg:gap-5">
          <button onClick={prev} disabled={!canPrev} className="hidden lg:grid place-items-center w-8 h-8 rounded-full bg-white/80 text-[#1a1a1a] disabled:opacity-0 hover:bg-white" aria-label="Anterior">
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          {/* Historia actual */}
          <div className="relative w-screen h-[100dvh] lg:w-auto lg:h-[94vh] lg:max-h-[920px] lg:aspect-[9/16] lg:rounded-[10px] overflow-hidden select-none" style={{ background: BG }}>
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />

            {/* Barras */}
            <div className="absolute top-3 inset-x-3 z-20 flex gap-1">
              {group.slides.map((s, i) => (
                <span key={s.id} className="h-[2px] flex-1 rounded-full bg-white/35 overflow-hidden">
                  <span className="block h-full bg-white" style={{ width: `${i < pos.s ? 100 : i === pos.s ? progress * 100 : 0}%` }} />
                </span>
              ))}
            </div>

            {/* Cabecera */}
            <div className="absolute top-6 inset-x-3 z-20 flex items-center gap-2.5">
              <Bubble g={group} size={34} />
              <span className="text-[15px] font-semibold">{group.name}</span>
              <span className="text-[15px] text-white/70">{timeAgo(slide.at)}</span>
              <div className="ml-auto flex items-center">
                {isVideo && (
                  <button onClick={() => setMuted((m) => !m)} className="grid place-items-center w-9 h-9 rounded-full hover:bg-white/10 text-sm font-medium" aria-label={muted ? "Activar sonido" : "Silenciar"}>
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                )}
                <button onClick={() => setPaused((v) => !v)} className="grid place-items-center w-9 h-9 rounded-full hover:bg-white/10" aria-label={paused ? "Reanudar" : "Pausar"}>
                  {paused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                </button>
                <button onClick={onClose} className="lg:hidden grid place-items-center w-9 h-9 rounded-full hover:bg-white/10" aria-label="Cerrar">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Zonas de toque */}
            <div
              className="absolute inset-x-0 top-0 bottom-24 z-10 grid grid-cols-[1fr_2fr]"
              onPointerDown={() => setHolding(true)}
              onPointerUp={() => setHolding(false)}
              onPointerLeave={() => setHolding(false)}
            >
              <button aria-label="Anterior" onClick={prev} />
              <button aria-label="Siguiente" onClick={next} />
            </div>

            {slide.media?.type === "image" && (
              <img key={slide.id} src={slide.media.url} alt="" className="absolute inset-0 w-full h-full object-contain bg-black" />
            )}
            {isVideo && (
              <video
                key={slide.id}
                ref={videoRef}
                src={slide.media!.url}
                autoPlay
                playsInline
                muted={muted}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
                onEnded={next}
              />
            )}
            {slide.media ? (
              slide.body && (
                <div className="absolute inset-x-0 bottom-28 z-[5] px-6 pointer-events-none">
                  <p className="mx-auto w-fit max-w-full rounded-xl bg-black/55 px-4 py-2.5 text-center text-[17px] font-medium leading-snug whitespace-pre-line break-words">{slide.body}</p>
                </div>
              )
            ) : (
              <div className="pointer-events-none"><SlideBody slide={slide} /></div>
            )}

            {/* Pie */}
            <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-5 pt-10 bg-gradient-to-t from-black/45 to-transparent">
              {slide.postId ? (
                <div className="space-y-2">
                  {slide.link && (
                    <Link href={slide.link} onClick={onClose} className="inline-flex items-center gap-1 text-sm text-white/85 hover:text-white">
                      {slide.cta ?? "Ver"} <ArrowRight size={14} />
                    </Link>
                  )}
                  <form onSubmit={sendReply} className="flex items-center gap-3">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onFocus={() => setTyping(true)}
                      onBlur={() => setTyping(false)}
                      placeholder={sent ?? `Responder a ${group.name}...`}
                      className="flex-1 min-w-0 rounded-full border border-white/50 bg-transparent px-5 py-3 text-[15px] text-white placeholder:text-white/80 outline-none focus:border-white"
                    />
                    <button type="button" onClick={like} className="shrink-0" aria-label={liked ? "Quitar me gusta" : "Me gusta"} aria-pressed={liked}>
                      <Heart size={26} strokeWidth={1.8} className={liked ? "text-accent" : ""} fill={liked ? "currentColor" : "none"} />
                    </button>
                    <button type="submit" disabled={!reply.trim()} className="shrink-0 disabled:opacity-60" aria-label="Enviar respuesta">
                      <Send size={24} strokeWidth={1.8} />
                    </button>
                  </form>
                </div>
              ) : slide.mine ? (
                <button onClick={removeStory} className="flex items-center gap-2 text-sm text-white/85 hover:text-white"><Trash2 size={16} /> Eliminar historia</button>
              ) : slide.link ? (
                <Link href={slide.link} onClick={onClose} className="btn bg-accent text-on-accent w-full justify-center">
                  {slide.cta ?? "Ver"} <ArrowRight size={16} />
                </Link>
              ) : null}
            </div>
          </div>

          <button onClick={next} className="hidden lg:grid place-items-center w-8 h-8 rounded-full bg-white/80 text-[#1a1a1a] hover:bg-white" aria-label="Siguiente">
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Previas siguientes */}
        <div className="hidden lg:flex gap-14 items-center justify-start flex-1">
          {after.map(({ g, idx }) => <SidePreview key={g.id} g={g} far={idx > pos.g + 1} onClick={() => go({ g: idx, s: 0 })} />)}
        </div>
      </div>
    </div>
  );
}
