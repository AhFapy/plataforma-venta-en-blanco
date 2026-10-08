import type { Lesson, Module } from "./types";

export function initials(name?: string | null) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function firstName(name?: string | null) {
  return (name || "").split(" ")[0] || "";
}

const TZ = "Europe/Madrid";

export function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24); if (d < 30) return `hace ${d} d`;
  return fmtDate(iso);
}

/** Convierte una URL de vídeo en un src embebible. Devuelve tipo y url. */
export function videoEmbed(url?: string | null): { kind: "iframe" | "file"; src: string } | null {
  if (!url) return null;
  const u = url.trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)))
    return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` };
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/)))
    return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}` };
  if ((m = u.match(/loom\.com\/(?:share|embed)\/(\w+)/)))
    return { kind: "iframe", src: `https://www.loom.com/embed/${m[1]}` };
  // Bunny Stream: pegar la URL de embed (iframe.mediadelivery.net/embed/LIB/ID) o de play
  if ((m = u.match(/(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([\w-]+)/)))
    return { kind: "iframe", src: `https://iframe.mediadelivery.net/embed/${m[1]}/${m[2]}?autoplay=false&preload=true` };
  if (/\.(mp4|webm|m3u8|mov)(\?|$)/i.test(u)) return { kind: "file", src: u };
  return { kind: "iframe", src: u };
}

export type ModuleState = { unlocked: boolean; reason?: string; done: number; total: number };

/** Calcula qué módulos están desbloqueados para un alumno. Los módulos deben venir ordenados. */
export function moduleStates(
  modules: Module[],
  lessons: Pick<Lesson, "id" | "module_id">[],
  completed: Set<string>,
  enrolledAt: string,
  isStaff: boolean
): Map<string, ModuleState> {
  const out = new Map<string, ModuleState>();
  let prevComplete = true;
  const daysIn = (Date.now() - new Date(enrolledAt).getTime()) / 86_400_000;
  for (const mod of modules) {
    const ls = lessons.filter((l) => l.module_id === mod.id);
    const done = ls.filter((l) => completed.has(l.id)).length;
    let unlocked = true;
    let reason: string | undefined;
    if (!isStaff) {
      if (mod.unlock_mode === "progreso" && !prevComplete) { unlocked = false; reason = "Completa el módulo anterior"; }
      if (mod.unlock_mode === "fecha" && daysIn < mod.unlock_after_days) {
        unlocked = false;
        const left = Math.ceil(mod.unlock_after_days - daysIn);
        reason = `Se abre en ${left} ${left === 1 ? "día" : "días"}`;
      }
    }
    out.set(mod.id, { unlocked, reason, done, total: ls.length });
    prevComplete = ls.length === 0 ? prevComplete : done === ls.length;
  }
  return out;
}

export function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 30 * 86_400_000;
}
