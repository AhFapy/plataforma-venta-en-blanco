import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { Quiz } from "./Quiz";

export const metadata = { title: "Quiz del módulo" };

export default async function QuizPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const { supabase, profile } = await requireMember();
  const cur = await getCurriculum(supabase, profile);
  const mod = cur.modules.find((m) => m.id === moduleId);
  if (!mod) notFound();
  const course = cur.courses.find((c) => c.id === mod.course_id)!;
  const [{ data: qs }, { data: attempt }] = await Promise.all([
    supabase.from("quiz_questions").select("id,question,options,position").eq("module_id", moduleId).order("position"),
    supabase.from("quiz_attempts").select("best,total,passed,attempts").eq("user_id", profile.id).eq("module_id", moduleId).maybeSingle(),
  ]);
  const questions = (qs ?? []) as { id: string; question: string; options: string[] }[];
  if (!questions.length) notFound();
  const st = cur.states.get(mod.id);
  const staff = profile.role !== "alumno";
  const ready = staff || (!!st?.unlocked && st.total > 0 && st.done === st.total);
  const back = `/formacion/${course.id}`;

  return (
    <div className="fade-in max-w-2xl space-y-6">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> {course.title}</Link>
      <header className="space-y-2">
        <p className="label">Quiz · {mod.title}</p>
        <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">¿Lo tienes <span className="em">claro?</span></h1>
        <p className="text-ink-muted">{questions.length} preguntas. Se aprueba con un 70 %. Puedes repetirlo las veces que quieras.</p>
        {attempt && <p className="text-sm">{attempt.passed ? <span className="badge !bg-accent-soft !text-brand-deep">Aprobado · mejor nota {attempt.best}/{attempt.total}</span> : <span className="badge">Mejor nota {attempt.best}/{attempt.total} · {attempt.attempts} {attempt.attempts === 1 ? "intento" : "intentos"}</span>}</p>}
      </header>
      {ready ? (
        <Quiz moduleId={mod.id} questions={questions} backHref={back} />
      ) : (
        <section className="card p-8 text-center space-y-3">
          <Lock size={22} className="mx-auto text-ink-faint" />
          <p className="font-semibold">Termina las clases del módulo para hacer el quiz</p>
          <p className="text-ink-muted text-sm">Llevas {st?.done ?? 0} de {st?.total ?? 0}.</p>
        </section>
      )}
    </div>
  );
}
