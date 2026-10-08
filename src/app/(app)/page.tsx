import Link from "next/link";
import { ArrowRight, CalendarDays, PlayCircle, Target, Trophy } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum, getMyPoints, level } from "@/lib/data";
import { firstName, fmtDateTime } from "@/lib/utils";
import { ProgressBar } from "@/components/Progress";
import { Avatar } from "@/components/Avatar";

export default async function Home() {
  const { supabase, profile } = await requireMember();
  const [cur, pts, { data: nextEvent }, { data: top }] = await Promise.all([
    getCurriculum(supabase, profile),
    getMyPoints(supabase, profile.id),
    supabase.from("events").select("*").gte("starts_at", new Date(Date.now() - 2 * 3600_000).toISOString()).order("starts_at").limit(1).maybeSingle(),
    supabase.from("leaderboard").select("user_id,full_name,avatar_url,points_month").order("points_month", { ascending: false }).limit(5),
  ]);

  const total = cur.ordered.length;
  const done = cur.ordered.filter((l) => cur.completed.has(l.id)).length;
  const lvl = level(pts.total);

  // Ruta de 6 meses: 3 de formación + 3 de seguimiento
  const monthsIn = (Date.now() - new Date(profile.enrolled_at).getTime()) / (30.44 * 86_400_000);
  const month = Math.min(6, Math.floor(monthsIn) + 1);
  const phase = month <= 3 ? "Formación" : "Seguimiento";

  return (
    <div className="space-y-6 fade-in">
      <div>
        <span className="badge badge-dot mb-4">Mes {month} de 6 · {phase}</span>
        <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.035em]">
          Hola, {firstName(profile.full_name)}. <span className="em">A por ello.</span>
        </h1>
      </div>

      {/* Ruta */}
      <div className="grid grid-cols-6 gap-1.5" aria-label="Ruta de 6 meses">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <div className={`h-1.5 rounded-full ${i + 1 < month ? "bg-brand" : i + 1 === month ? "bg-accent" : "bg-bg-badge"}`} />
            <p className={`text-[10px] font-mono uppercase tracking-wider ${i + 1 === month ? "text-ink" : "text-ink-faint"}`}>
              {i < 3 ? "Form." : "Seg."} {i + 1}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Siguiente lección */}
        <section className="on-dark lg:col-span-2 rounded-[24px] bg-bg-dark p-7 text-[#f5f4ef] flex flex-col justify-between gap-8 min-h-[240px]">
          <div className="flex items-center justify-between">
            <p className="label !text-[#a4a8a4]">Tu siguiente paso</p>
            <p className="text-sm text-[#a4a8a4]">{done}/{total} lecciones</p>
          </div>
          {cur.next ? (
            <div className="space-y-3">
              <p className="text-sm text-[#a4a8a4]">{cur.next.course.title} · {cur.next.module.title}</p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">{cur.next.title}</h2>
            </div>
          ) : (
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">
              {total > 0 ? <>Has completado todo. <span className="em">Bestia.</span></> : "El contenido llega en breve."}
            </h2>
          )}
          <div className="space-y-4">
            <ProgressBar value={total ? done / total : 0} dark />
            {cur.next && (
              <Link href={`/formacion/leccion/${cur.next.id}`} className="btn bg-accent text-ink">
                <PlayCircle size={16} /> {done === 0 ? "Empezar" : "Continuar"}
              </Link>
            )}
          </div>
        </section>

        {/* Puntos */}
        <Link href="/ranking" className="card p-7 flex flex-col justify-between gap-6 hover:border-brand transition-colors">
          <div className="flex items-center justify-between">
            <p className="label">Tu nivel</p>
            <Trophy size={18} className="text-brand" />
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-[-0.03em]">{lvl.name}</p>
            <p className="text-sm text-ink-muted mt-1">{pts.total} puntos · {pts.rank ? `#${pts.rank} este mes` : "sin ranking aún"}</p>
          </div>
          <div className="space-y-2">
            <ProgressBar value={lvl.pct} />
            <p className="text-xs text-ink-faint">{lvl.next ? `${lvl.toNext} puntos para ${lvl.next}` : "Nivel máximo"}</p>
          </div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Objetivos */}
        <section className="card p-7 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <p className="label">Tus 3 objetivos</p>
            <Link href="/perfil" className="text-xs text-ink-muted underline">Editar</Link>
          </div>
          <ol className="space-y-3">
            {profile.objectives.map((o, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="text-brand font-semibold text-xl leading-none w-6">{i + 1}</span>
                <span className="text-[17px] leading-snug">{o}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-5 border-t border-line flex items-center gap-2 text-sm text-ink-muted">
            <Target size={15} /> A mejorar: {profile.improvements.join(" · ")}
          </div>
        </section>

        {/* Próximo directo */}
        <section className="card p-7 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <p className="label">Próximo directo</p>
            <CalendarDays size={18} className="text-brand" />
          </div>
          {nextEvent ? (
            <>
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em]">{nextEvent.title}</p>
                <p className="text-sm text-ink-muted mt-1 capitalize">{fmtDateTime(nextEvent.starts_at)} (hora España)</p>
              </div>
              {nextEvent.meeting_url ? (
                <a href={nextEvent.meeting_url} target="_blank" rel="noreferrer" className="btn btn-brand self-start">Entrar <ArrowRight size={16} /></a>
              ) : (
                <Link href="/eventos" className="btn btn-ghost self-start">Ver calendario</Link>
              )}
            </>
          ) : (
            <p className="text-ink-muted">No hay directos programados.</p>
          )}
        </section>
      </div>

      {/* Top del mes */}
      <section className="card p-7">
        <div className="flex items-center justify-between mb-5">
          <p className="label">Top del mes</p>
          <Link href="/ranking" className="text-sm text-ink-muted flex items-center gap-1">Ranking <ArrowRight size={14} /></Link>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {(top ?? []).filter((r) => r.points_month > 0).map((r, i) => (
            <div key={r.user_id} className="flex items-center gap-3">
              <span className="text-ink-faint font-mono text-sm w-4">{i + 1}</span>
              <Avatar name={r.full_name} url={r.avatar_url} size={32} />
              <div>
                <p className="text-sm font-medium">{r.full_name}</p>
                <p className="text-xs text-ink-faint">{r.points_month} pts</p>
              </div>
            </div>
          ))}
          {!(top ?? []).some((r) => r.points_month > 0) && <p className="text-ink-muted text-sm">Nadie ha puntuado este mes. Primera lección y eres el número 1.</p>}
        </div>
      </section>
    </div>
  );
}
