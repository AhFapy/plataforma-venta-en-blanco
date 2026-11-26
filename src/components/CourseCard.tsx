import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { ProgressBar } from "@/components/Progress";
import { isNew } from "@/lib/utils";
import type { Course, Lesson } from "@/lib/types";

/** Tarjeta de formación. `lessons` = clases de la formación y de sus formaciones hijas. */
export function CourseCard({ c, lessons, completed }: { c: Course; lessons: Lesson[]; completed: Set<string> }) {
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const fresh = lessons.some((l) => isNew(l.updated_at));
  return (
    <Link href={`/formacion/${c.id}`} className="card overflow-hidden group hover:border-brand transition-colors">
      {c.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.cover_url} alt="" className="aspect-[16/8] w-full object-cover" />
      ) : (
        <div className="on-dark aspect-[16/8] bg-bg-dark grid place-items-center p-6">
          <p className="text-[#f5f4ef] text-2xl font-semibold tracking-[-0.03em] text-center">{c.title}</p>
        </div>
      )}
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{c.title}</h2>
          <div className="flex gap-1.5 shrink-0">
            {!c.published && <span className="badge">Borrador</span>}
            {fresh && <span className="badge !bg-accent-soft !text-brand-deep">Nuevo</span>}
          </div>
        </div>
        {c.description && <p className="text-sm text-ink-muted line-clamp-2">{c.description}</p>}
        <ProgressBar value={lessons.length ? done / lessons.length : 0} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">{done}/{lessons.length} lecciones</span>
          <span className="flex items-center gap-1 font-medium group-hover:text-brand">Abrir <ArrowRight size={14} /></span>
        </div>
      </div>
    </Link>
  );
}

/** Tarjeta del Círculo privado (upsell): abre la página con el vídeo y el WhatsApp de Javi. */
export function CirculoCard() {
  return (
    <Link href="/formacion/circulo-privado" className="card overflow-hidden group hover:border-brand transition-colors">
      <div className="on-dark aspect-[16/8] bg-bg-dark grid place-items-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Lock size={28} className="text-[#f5f4ef]" />
          <p className="text-[#f5f4ef] text-2xl font-semibold tracking-[-0.03em] text-center">Círculo privado</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Círculo privado</h2>
          <span className="badge shrink-0 !bg-accent-soft !text-brand-deep">Nuevo</span>
        </div>
        <p className="text-sm text-ink-muted line-clamp-2">Tu siguiente paso después de Venta en Blanco: llegar a 10.000 € al mes.</p>
        <div className="flex items-center justify-end text-sm">
          <span className="flex items-center gap-1 font-medium group-hover:text-brand">Ver vídeo <ArrowRight size={14} /></span>
        </div>
      </div>
    </Link>
  );
}

/** Tarjeta bloqueada, sin enlace: se ve pero no se puede abrir. */
export function LockedCard({ title, description }: { title: string; description?: string }) {
  return (
    <div aria-disabled="true" className="card overflow-hidden select-none cursor-not-allowed opacity-80">
      <div className="on-dark aspect-[16/8] bg-bg-dark grid place-items-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Lock size={28} className="text-[#f5f4ef]" />
          <p className="text-[#f5f4ef] text-2xl font-semibold tracking-[-0.03em] text-center">{title}</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{title}</h2>
          <span className="badge shrink-0">Próximamente</span>
        </div>
        {description && <p className="text-sm text-ink-muted line-clamp-2">{description}</p>}
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>Cerrado</span>
          <span className="flex items-center gap-1"><Lock size={14} /> Próximamente</span>
        </div>
      </div>
    </div>
  );
}

/** Ids de una formación y todas sus formaciones hijas. */
export function courseTree(courses: Course[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of courses) if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) { ids.add(c.id); grew = true; }
  }
  return ids;
}
