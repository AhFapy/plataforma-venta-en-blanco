import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
