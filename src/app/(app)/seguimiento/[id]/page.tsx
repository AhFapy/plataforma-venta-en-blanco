import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, MessageCircle, Send } from "lucide-react";
import { requireCsm } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { fmtDateTime, timeAgo } from "@/lib/utils";
import { dueCheckins, eur, fmtDay, STAGE_LABEL, STAGES, type Overview } from "@/lib/followup";
import { FollowupForm } from "./FollowupForm";
import { CheckinForm } from "./CheckinForm";

export const metadata = { title: "Ficha de seguimiento" };

const FIELD: Record<string, string> = {
  start_date: "Fecha de entrada", goals_3m: "Objetivos 3 meses", quick_wins: "Quick wins", stage_goals: "Objetivos por etapa",
  active_projects: "Proyectos activos", projects_notes: "Proyectos", revenue: "Facturación", interviews: "Entrevistas",
  job_applications: "Aplicaciones", sessions_manual: "Sesiones (a mano)", at_risk_manual: "En riesgo (a mano)", guarantee: "Garantía",
  testimonial: "Testimonio", offboarding: "Offboarding", status: "Estado",
};
const show = (v: unknown) => v === null || v === undefined || v === "" ? "—" : v === true ? "sí" : v === false ? "no" : String(v);

export default async function FollowupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireCsm();
  const [{ data: f }, { data: ov }, { data: checkins }, { data: log }, { data: priv }, { data: testi }, { count: attended }] = await Promise.all([
    supabase.from("followups").select("*").eq("user_id", id).maybeSingle(),
    supabase.rpc("followup_overview"),
    supabase.from("checkins").select("id,stage,checkin_date,notes,created_at,author:profiles!checkins_author_id_fkey(full_name)").eq("user_id", id).order("checkin_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("followup_log").select("id,changed_at,changes,who:profiles!followup_log_changed_by_fkey(full_name)").eq("user_id", id).order("changed_at", { ascending: false }).limit(50),
    supabase.from("profile_private").select("goal,objectives,situation").eq("id", id).maybeSingle(),
    supabase.from("testimonials").select("status,kind,updated_at").eq("user_id", id).maybeSingle(),
    supabase.from("event_attendance").select("event_id", { count: "exact", head: true }).eq("user_id", id),
  ]);
  if (!f) notFound();
  const o = ((ov ?? []) as Overview[]).find((r) => r.user_id === id)!;
  const pending = dueCheckins(o);
  const suggested = pending[0]?.key ?? STAGES.find((s) => !o.done_stages.includes(s.key))?.key ?? "extra";
  type C = { id: string; stage: string; checkin_date: string; notes: string; created_at: string; author: { full_name: string | null } | null };
  type Lg = { id: number; changed_at: string; changes: Record<string, { antes: unknown; ahora: unknown }>; who: { full_name: string | null } | null };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/seguimiento" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Seguimiento</Link>

      <section className="card p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
        <Avatar name={o.full_name} url={o.avatar_url} size={72} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{o.full_name || "—"}</h1>
          <p className="text-sm text-ink-muted break-all">{o.email}{o.phone ? ` · ${o.phone}` : ""}</p>
          <div className="flex flex-wrap gap-2">
            <span className="badge">Mes {o.month} de 6</span>
            <span className="badge">Entrada {fmtDay(o.start_date)}</span>
            {o.at_risk && <span className="badge !bg-red-50 !text-red-800"><AlertTriangle size={12} /> En riesgo · {o.at_risk_manual !== null ? "marcado a mano" : o.risk_reason}</span>}
            {o.status === "finalizado" && <span className="badge">Finalizado</span>}
          </div>
        </div>
        <div className="flex sm:flex-col gap-2">
          {o.phone && <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn btn-brand !py-2"><MessageCircle size={15} /> WhatsApp</a>}
          <Link href={`/mensajes/${id}`} className="btn btn-ghost !py-2"><Send size={15} /> Mensaje</Link>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Progreso del curso", `${o.progress_pct}%`],
          ["Última actividad", o.last_seen_at ? timeAgo(o.last_seen_at) : "Nunca"],
          ["Sesiones de grupo", String(o.sessions)],
          ["Aplicaciones", String(o.applications)],
          ["Proyectos activos", String(o.active_projects)],
          ["Facturación", eur(o.revenue)],
          ["Entrevistas", String(o.interviews)],
          ["Testimonio", testi ? (testi.status === "publicado" ? "Publicado" : testi.status === "enviado" ? "Enviado, por revisar" : "Borrador") : o.testimonial === "hecho" ? "Hecho" : "Pendiente"],
        ].map(([k, v]) => (
          <div key={k} className="card p-4"><p className="text-xs text-ink-muted">{k}</p><p className="mt-1 text-lg font-semibold tabular-nums">{v}</p></div>
        ))}
      </section>

      {(priv?.goal || priv?.objectives?.length) && (
        <section className="card p-6 space-y-3">
          <p className="label">Lo que dijo en su onboarding</p>
          {priv?.goal && <p className="text-[15px] whitespace-pre-line"><span className="text-ink-muted">Quiere conseguir: </span>{priv.goal}</p>}
          {priv?.objectives?.length ? <ol className="list-decimal pl-5 text-[15px] space-y-1">{(priv.objectives as string[]).map((x, i) => <li key={i}>{x}</li>)}</ol> : null}
        </section>
      )}

      <section className="card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label">Check-ins</p>
          {pending.length > 0 && <p className="text-sm text-ink-muted">Toca: {pending.map((p) => `${p.label}${p.overdue ? " (atrasado)" : ""}`).join(", ")}</p>}
        </div>
        <CheckinForm userId={id} suggested={suggested} />
        <ul className="divide-y divide-line">
          {((checkins ?? []) as unknown as C[]).map((c) => (
            <li key={c.id} className="py-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="badge">{STAGE_LABEL[c.stage] ?? c.stage}</span>
                <span className="text-ink-muted">{fmtDay(c.checkin_date)}</span>
                <span className="text-xs text-ink-faint">· {c.author?.full_name ?? "—"} · guardado {fmtDateTime(c.created_at)}</span>
              </div>
              <p className="text-[15px] whitespace-pre-line break-words">{c.notes}</p>
            </li>
          ))}
          {!checkins?.length && <li className="py-3 text-sm text-ink-faint">Aún no hay check-ins.</li>}
        </ul>
      </section>

      <FollowupForm userId={id} f={f} sessionsRecorded={attended ?? 0} autoRisk={o.at_risk_auto ? o.risk_reason : null} />

      <details className="card p-6">
        <summary className="cursor-pointer label">Historial de cambios de la ficha</summary>
        <ul className="mt-4 divide-y divide-line text-sm">
          {((log ?? []) as unknown as Lg[]).map((l) => (
            <li key={l.id} className="py-3 space-y-1">
              <p className="text-xs text-ink-faint">{fmtDateTime(l.changed_at)} · {l.who?.full_name ?? "Sistema"}</p>
              {Object.entries(l.changes).map(([k, v]) => (
                <p key={k} className="break-words"><span className="text-ink-muted">{FIELD[k] ?? k}:</span> {show(v.antes)} → <b>{show(v.ahora)}</b></p>
              ))}
            </li>
          ))}
          {!log?.length && <li className="py-3 text-ink-faint">Sin cambios todavía.</li>}
        </ul>
      </details>
    </div>
  );
}
