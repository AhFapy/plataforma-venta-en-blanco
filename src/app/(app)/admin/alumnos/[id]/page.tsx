import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { getMyPoints, level } from "@/lib/data";
import { fmtDate, timeAgo } from "@/lib/utils";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Ficha de alumno" };

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile: me } = await requireStaff();
  const [{ data: p }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,avatar_url,role,active,cohort,bio,enrolled_at,last_seen_at,onboarded_at").eq("id", id).maybeSingle(),
    supabase.from("profile_private").select("email,phone,situation,goal,weekly_hours,objectives,improvements").eq("id", id).maybeSingle(),
  ]);
  if (!p) notFound();

  const [pts, { data: progress }, { count: totalLessons }, { data: subs }, { data: quizzes }, { data: posts }] = await Promise.all([
    getMyPoints(supabase, id),
    supabase.from("lesson_progress").select("lesson_id,completed_at").eq("user_id", id).order("completed_at", { ascending: false }).limit(5),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("published", true),
    supabase.from("submissions").select("id,body,file_name,feedback,updated_at,lesson:lessons(id,title)").eq("user_id", id).order("updated_at", { ascending: false }).limit(20),
    supabase.from("quiz_attempts").select("best,total,passed,attempts,updated_at,module:modules(title)").eq("user_id", id).order("updated_at", { ascending: false }),
    supabase.from("posts").select("id,body,created_at,channel:channels(name)").eq("author_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  const { count: doneCount } = await supabase.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", id);
  const lvl = level(pts.total);
  const situation = priv?.situation ?? null;

  const Q = ({ q, children }: { q: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <p className="text-sm text-ink-muted">{q}</p>
      <div className="text-[15px] whitespace-pre-line break-words">{children || <span className="text-ink-faint">Sin responder</span>}</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/alumnos" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Alumnos</Link>

      <section className="card p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
        <Avatar name={p.full_name} url={p.avatar_url} size={80} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{p.full_name || "—"}</h1>
          <p className="text-sm text-ink-muted">{priv?.email}{priv?.phone ? ` · ${priv.phone}` : ""}</p>
          <div className="flex flex-wrap gap-2">
            {!p.active && <span className="badge !bg-red-50 !text-red-800">Desactivado</span>}
            {p.cohort && <span className="badge">Promoción {p.cohort}</span>}
            <span className="badge">{lvl.name} · {pts.total} pts</span>
            <span className="badge">Alta {fmtDate(p.enrolled_at)}</span>
            <span className="badge">{p.last_seen_at ? `Última vez ${timeAgo(p.last_seen_at)}` : "Nunca ha entrado"}</span>
          </div>
        </div>
        <div className="flex sm:flex-col gap-2">
          {priv?.phone && <a href={`https://wa.me/${priv.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn btn-brand !py-2"><MessageCircle size={15} /> WhatsApp</a>}
          <Link href={`/mensajes/${p.id}`} className="btn btn-ghost !py-2"><Send size={15} /> Mensaje</Link>
        </div>
      </section>

      {me.role === "admin" && <PasswordForm id={p.id} />}

      <section className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="label">Onboarding</p>
          <span className="text-xs text-ink-faint">{p.onboarded_at ? `Completado ${fmtDate(p.onboarded_at)}` : "Sin completar"}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <Q q="Preséntate en dos líneas">{p.bio}</Q>
          <Q q="Situación actual">{situation}</Q>
          <Q q="Horas a la semana que puede dedicar">{priv?.weekly_hours ? `${priv.weekly_hours} h` : null}</Q>
          <Q q="¿Qué quiere conseguir en estos 6 meses?">{priv?.goal}</Q>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <Q q="Sus 3 objetivos">
            {priv?.objectives?.length ? <ol className="list-decimal pl-5 space-y-1">{priv.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ol> : null}
          </Q>
          <Q q="3 puntos a mejorar">
            {priv?.improvements?.length ? <ol className="list-decimal pl-5 space-y-1">{priv.improvements.map((o: string, i: number) => <li key={i}>{o}</li>)}</ol> : null}
          </Q>
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="card p-5"><p className="label mb-1">Clases vistas</p><p className="text-xl font-semibold">{doneCount ?? 0}<span className="text-ink-faint text-base">/{totalLessons ?? 0}</span></p></div>
        <div className="card p-5"><p className="label mb-1">Deberes entregados</p><p className="text-xl font-semibold">{subs?.length ?? 0}</p></div>
        <div className="card p-5"><p className="label mb-1">Quizzes aprobados</p><p className="text-xl font-semibold">{(quizzes ?? []).filter((q) => q.passed).length}<span className="text-ink-faint text-base">/{quizzes?.length ?? 0}</span></p></div>
      </div>

      <section className="card p-6 space-y-3">
        <p className="label">Deberes</p>
        {(subs ?? []).length === 0 && <p className="text-sm text-ink-muted">Todavía no ha entregado ninguno.</p>}
        {((subs ?? []) as unknown as { id: string; body: string | null; file_name: string | null; feedback: string | null; updated_at: string; lesson: { id: string; title: string } | null }[]).map((s) => (
          <div key={s.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
            <p className="text-sm font-medium">{s.lesson?.title} <span className="text-ink-faint font-normal">· {timeAgo(s.updated_at)}</span> {s.feedback ? <span className="badge !py-0 !text-[10px] !bg-accent-soft !text-brand-deep ml-1">Corregido</span> : <span className="badge !py-0 !text-[10px] ml-1">Pendiente</span>}</p>
            {s.body && <p className="text-sm text-ink-muted line-clamp-3 whitespace-pre-line">{s.body}</p>}
            {s.file_name && <p className="text-xs text-ink-faint">📎 {s.file_name}</p>}
          </div>
        ))}
        {(subs ?? []).length > 0 && <Link href="/admin/deberes" className="text-sm text-brand">Corregir en Deberes →</Link>}
      </section>

      {(quizzes ?? []).length > 0 && (
        <section className="card p-6 space-y-2">
          <p className="label">Quizzes</p>
          {((quizzes ?? []) as unknown as { best: number; total: number; passed: boolean; attempts: number; module: { title: string } | null }[]).map((q, i) => (
            <p key={i} className="text-[15px] flex justify-between gap-3"><span>{q.module?.title}</span><span className={q.passed ? "text-brand" : "text-ink-muted"}>{q.best}/{q.total} · {q.attempts} {q.attempts === 1 ? "intento" : "intentos"}</span></p>
          ))}
        </section>
      )}

      <section className="card p-6 space-y-3">
        <p className="label">Últimas publicaciones</p>
        {(posts ?? []).length === 0 && <p className="text-sm text-ink-muted">No ha publicado.</p>}
        {((posts ?? []) as unknown as { id: string; body: string; created_at: string; channel: { name: string } | null }[]).map((x) => (
          <Link key={x.id} href={`/comunidad/post/${x.id}`} className="block border-t border-line pt-3 first:border-0 first:pt-0 hover:text-brand">
            <p className="text-xs text-ink-faint">{x.channel?.name} · {timeAgo(x.created_at)}</p>
            <p className="text-sm line-clamp-2">{x.body}</p>
          </Link>
        ))}
      </section>
      {progress && progress.length > 0 && <p className="text-xs text-ink-faint">Última clase completada {timeAgo((progress[0] as { completed_at: string }).completed_at)}</p>}
    </div>
  );
}
