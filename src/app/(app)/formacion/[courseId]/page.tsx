import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock, ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { ProgressBar } from "@/components/Progress";
import { isNew } from "@/lib/utils";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase, profile } = await requireMember();
  const cur = await getCurriculum(supabase, profile);
  const course = cur.courses.find((c) => c.id === courseId);
  if (!course) notFound();
  const mods = cur.modules.filter((m) => m.course_id === course.id);

  return (
    <div className="fade-in space-y-8">
      <Link href="/formacion" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Formación</Link>
      <div>
        <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.035em]">{course.title}</h1>
        {course.description && <p className="mt-3 text-ink-muted text-lg max-w-2xl">{course.description}</p>}
      </div>

      <div className="space-y-4">
        {mods.map((m, mi) => {
          const st = cur.states.get(m.id)!;
          const ls = cur.lessons.filter((l) => l.module_id === m.id);
          return (
            <section key={m.id} className={`card p-6 ${st.unlocked ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-brand font-semibold text-2xl tabular-nums">{String(mi + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em]">{m.title}</h2>
                    <p className="text-sm text-ink-muted">{st.done}/{st.total} lecciones</p>
                  </div>
                </div>
                {!st.unlocked && <span className="badge"><Lock size={12} /> {st.reason}</span>}
                {st.unlocked && st.total > 0 && st.done === st.total && <span className="badge !bg-brand !text-white">Completado</span>}
              </div>
              {st.unlocked && <ProgressBar value={st.total ? st.done / st.total : 0} />}
              <ul className="mt-4 divide-y divide-line">
                {ls.map((l) => {
                  const done = cur.completed.has(l.id);
                  const inner = (
                    <>
                      {!st.unlocked ? <Lock size={18} className="text-ink-faint" /> : done ? <CheckCircle2 size={18} className="text-brand" /> : <Circle size={18} className="text-ink-faint" />}
                      <span className="flex-1">{l.title}</span>
                      {isNew(l.updated_at) && <span className="badge !bg-accent-soft !text-brand-deep">Nuevo</span>}
                      {l.duration_min && <span className="text-xs text-ink-faint tabular-nums">{l.duration_min} min</span>}
                    </>
                  );
                  return (
                    <li key={l.id}>
                      {st.unlocked ? (
                        <Link href={`/formacion/leccion/${l.id}`} className="flex items-center gap-3 py-3 hover:text-brand">{inner}</Link>
                      ) : (
                        <div className="flex items-center gap-3 py-3 text-ink-muted">{inner}</div>
                      )}
                    </li>
                  );
                })}
                {ls.length === 0 && <li className="py-3 text-sm text-ink-faint">Sin lecciones todavía.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
