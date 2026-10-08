import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/Progress";
import { isNew } from "@/lib/utils";

export const metadata = { title: "Formación" };

export default async function Formacion() {
  const { supabase, profile } = await requireMember();
  const cur = await getCurriculum(supabase, profile);

  return (
    <div className="fade-in">
      <PageHeader label="Formación" title="El método," emphasis="paso a paso." />
      {cur.courses.length === 0 && <p className="text-ink-muted">Todavía no hay cursos publicados.</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {cur.courses.map((c) => {
          const ls = cur.ordered.filter((l) => l.course.id === c.id);
          const done = ls.filter((l) => cur.completed.has(l.id)).length;
          const fresh = ls.some((l) => isNew(l.updated_at));
          return (
            <Link key={c.id} href={`/formacion/${c.id}`} className="card overflow-hidden group hover:border-brand transition-colors">
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
                <ProgressBar value={ls.length ? done / ls.length : 0} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">{done}/{ls.length} lecciones</span>
                  <span className="flex items-center gap-1 font-medium group-hover:text-brand">Abrir <ArrowRight size={14} /></span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
