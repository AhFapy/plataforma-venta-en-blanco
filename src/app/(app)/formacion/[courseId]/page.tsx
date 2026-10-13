import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock, ArrowLeft, ListChecks } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { ProgressBar } from "@/components/Progress";
import { isNew } from "@/lib/utils";
import { SearchFilter } from "@/components/SearchFilter";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase, profile } = await requireMember();
  const cur = await getCurriculum(supabase, profile);
  const course = cur.courses.find((c) => c.id === courseId);
  if (!course) notFound();
  const mods = cur.modules.filter((m) => m.course_id === course.id);
  const modIds = mods.map((m) => m.id);
  const [{ data: qrows }, { data: arows }] = modIds.length ? await Promise.all([
    supabase.from("quiz_questions").select("module_id").in("module_id", modIds),
    supabase.from("quiz_attempts").select("module_id,best,total,passed").eq("user_id", profile.id).in("module_id", modIds),
  ]) : [{ data: [] }, { data: [] }];
  const quizCount = new Map<string, number>();
  for (const r of (qrows ?? []) as { module_id: string }[]) quizCount.set(r.module_id, (quizCount.get(r.module_id) ?? 0) + 1);
  const attempts = new Map(((arows ?? []) as { module_id: string; best: number; total: number; passed: boolean }[]).map((a) => [a.module_id, a]));

  return (
    <div className="fade-in space-y-8">
      <Link href="/formacion" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Formación</Link>
      <div>
        <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.035em]">{course.title}</h1>
        {course.description && <p className="mt-3 text-ink-muted text-lg max-w-2xl">{course.description}</p>}
      </div>

      <SearchFilter placeholder="Buscar una clase…">
        {mods.map((m, mi) => {
          const st = cur.states.get(m.id)!;
          const ls = cur.lessons.filter((l) => l.module_id === m.id);
          return (
            <section key={m.id} data-search-group={m.title} className={`card p-6 ${st.unlocked ? "" : "opacity-70"}`}>
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
              {st.unlocked && <div data-search-hide><ProgressBar value={st.total ? st.done / st.total : 0} /></div>}
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
                    <li key={l.id} data-search={l.title}>
                      {st.unlocked ? (
                        <Link href={`/formacion/leccion/${l.id}`} className="flex items-center gap-3 py-3 hover:text-brand">{inner}</Link>
                      ) : (
                        <div className="flex items-center gap-3 py-3 text-ink-muted">{inner}</div>
                      )}
                    </li>
                  );
                })}
                {ls.length === 0 && <li data-search-hide className="py-3 text-sm text-ink-faint">Sin lecciones todavía.</li>}
                {(quizCount.get(m.id) ?? 0) > 0 && (() => {
                  const a = attempts.get(m.id);
                  const ready = st.unlocked && st.total > 0 && st.done === st.total;
                  const inner = (
                    <>
                      {a?.passed ? <CheckCircle2 size={18} className="text-brand" /> : <ListChecks size={18} className={ready ? "text-brand" : "text-ink-faint"} />}
                      <span className="flex-1 font-medium">Quiz del módulo</span>
                      {a ? <span className="text-xs text-ink-faint tabular-nums">{a.best}/{a.total}</span> : !ready && <span className="text-xs text-ink-faint">Al terminar las clases</span>}
                      {ready && !a && <span className="badge !bg-accent-soft !text-brand-deep">Pendiente</span>}
                    </>
                  );
                  return (
                    <li data-search-hide>
                      {ready || a ? <Link href={`/formacion/quiz/${m.id}`} className="flex items-center gap-3 py-3 hover:text-brand">{inner}</Link> : <div className="flex items-center gap-3 py-3 text-ink-muted">{inner}</div>}
                    </li>
                  );
                })()}
              </ul>
            </section>
          );
        })}
      </SearchFilter>
    </div>
  );
}
