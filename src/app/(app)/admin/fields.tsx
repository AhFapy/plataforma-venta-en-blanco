import type { Course, EventRow, Lesson, LessonMedia, Module } from "@/lib/types";
import { Field } from "./ActionForm";

export function CourseFields({ c }: { c?: Course }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Título"><input name="title" className="input" defaultValue={c?.title} required /></Field>
      <Field label="Orden"><input name="position" type="number" className="input" defaultValue={c?.position ?? 0} /></Field>
      <div className="sm:col-span-2"><Field label="Descripción"><textarea name="description" className="input min-h-16" defaultValue={c?.description ?? ""} /></Field></div>
      <Field label="Portada (URL de imagen)" hint="Opcional. Sin portada se muestra el título sobre fondo oscuro."><input name="cover_url" className="input" defaultValue={c?.cover_url ?? ""} /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="published" defaultChecked={c?.published} /> Publicado (visible para alumnos)</label>
    </div>
  );
}

export function ModuleFields({ courseId, m, nextPos }: { courseId: string; m?: Module; nextPos?: number }) {
  return (
    <div className="grid sm:grid-cols-4 gap-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      <input type="hidden" name="course_id" value={courseId} />
      <div className="sm:col-span-2"><Field label="Título del módulo"><input name="title" className="input" defaultValue={m?.title} required /></Field></div>
      <Field label="Orden"><input name="position" type="number" className="input" defaultValue={m?.position ?? nextPos ?? 0} /></Field>
      <Field label="Desbloqueo">
        <select name="unlock_mode" className="input" defaultValue={m?.unlock_mode ?? "progreso"}>
          <option value="libre">Libre</option>
          <option value="progreso">Al completar el anterior</option>
          <option value="fecha">Por días desde el alta</option>
        </select>
      </Field>
      <div className="sm:col-span-3"><Field label="Descripción"><input name="description" className="input" defaultValue={m?.description ?? ""} /></Field></div>
      <Field label="Días (si es por fecha)"><input name="unlock_after_days" type="number" min={0} className="input" defaultValue={m?.unlock_after_days ?? 0} /></Field>
    </div>
  );
}

export function LessonFields({ moduleId, l, media, nextPos }: { moduleId: string; l?: Lesson; media?: LessonMedia; nextPos?: number }) {
  return (
    <div className="grid sm:grid-cols-4 gap-4">
      {l && <input type="hidden" name="id" value={l.id} />}
      <input type="hidden" name="module_id" value={moduleId} />
      <div className="sm:col-span-2"><Field label="Título de la lección"><input name="title" className="input" defaultValue={l?.title} required /></Field></div>
      <Field label="Orden"><input name="position" type="number" className="input" defaultValue={l?.position ?? nextPos ?? 0} /></Field>
      <Field label="Duración (min)"><input name="duration_min" type="number" min={0} className="input" defaultValue={l?.duration_min ?? ""} /></Field>
      <div className="sm:col-span-4">
        <Field label="Vídeo" hint="URL de Bunny Stream, Vimeo, YouTube (oculto), Loom o un .mp4 directo.">
          <input name="video_url" className="input" defaultValue={media?.video_url ?? ""} placeholder="https://iframe.mediadelivery.net/embed/…" />
        </Field>
      </div>
      <div className="sm:col-span-4"><Field label="Texto de la lección"><textarea name="description" className="input min-h-24" defaultValue={l?.description ?? ""} /></Field></div>
      <div className="sm:col-span-4">
        <Field label="Recursos descargables" hint="Uno por línea:  Texto | https://enlace">
          <textarea name="resources" className="input min-h-16 font-mono text-sm" defaultValue={(media?.resources ?? []).map((r) => `${r.label} | ${r.url}`).join("\n")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={l ? l.published : true} /> Publicada</label>
      {l && <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="bump" /> Marcar como actualizada (etiqueta “Nuevo” 30 días)</label>}
    </div>
  );
}

function toLocalMadrid(iso?: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return parts.replace(" ", "T");
}

export function EventFields({ e }: { e?: EventRow }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {e && <input type="hidden" name="id" value={e.id} />}
      <div className="sm:col-span-2"><Field label="Título"><input name="title" className="input" defaultValue={e?.title} required /></Field></div>
      <Field label="Empieza (hora España)"><input name="starts_at" type="datetime-local" className="input" defaultValue={toLocalMadrid(e?.starts_at)} required /></Field>
      <Field label="Termina (opcional)"><input name="ends_at" type="datetime-local" className="input" defaultValue={toLocalMadrid(e?.ends_at)} /></Field>
      <Field label="Enlace de la sesión (Zoom/Meet)"><input name="meeting_url" className="input" defaultValue={e?.meeting_url ?? ""} /></Field>
      <Field label="Grabación (después)"><input name="recording_url" className="input" defaultValue={e?.recording_url ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Descripción"><textarea name="description" className="input min-h-16" defaultValue={e?.description ?? ""} /></Field></div>
    </div>
  );
}
