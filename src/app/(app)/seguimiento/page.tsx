import Link from "next/link";
import { AlertTriangle, Clock, MessageSquareText } from "lucide-react";
import { requireCsm } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { timeAgo } from "@/lib/utils";
import { dueCheckins, fmtDay, type Overview } from "@/lib/followup";
import { StartFollowup } from "./StartFollowup";

export const metadata = { title: "Seguimiento" };

type SP = { mes?: string; riesgo?: string; estado?: string };

export default async function FollowupHome({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireCsm();
  const [{ data }, { data: allStudents }] = await Promise.all([
    supabase.rpc("followup_overview"),
    supabase.from("profiles").select("id,full_name").eq("role", "alumno").eq("active", true).order("full_name"),
  ]);
  const rows = (data ?? []) as Overview[];
  const tracked = new Set(rows.map((r) => r.user_id));
  const notTracked = (allStudents ?? []).filter((s) => !tracked.has(s.id)).map((s) => ({ id: s.id as string, name: (s.full_name as string) || "—" }));

  const active = rows.filter((r) => r.status === "activo");
  const due = active.flatMap((r) => dueCheckins(r).map((d) => ({ r, d }))).sort((a, b) => a.d.due.getTime() - b.d.due.getTime());
  const inactive = active.filter((r) => r.inactive_days >= 7).sort((a, b) => b.inactive_days - a.inactive_days);

  const estado = sp.estado ?? "activo";
  const list = rows.filter((r) =>
    (estado === "todos" || r.status === estado) &&
    (!sp.mes || r.month === Number(sp.mes)) &&
    (sp.riesgo !== "si" || r.at_risk));

  const q = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return `/seguimiento${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted hover:text-ink"}`;

  return (
    <div className="space-y-8">
      <PageHeader title="Seguimiento de" emphasis="alumnos." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 space-y-3">
          <div className="flex items-center gap-2"><MessageSquareText size={18} className="text-brand" /><p className="font-semibold">Check-ins de esta semana</p><span className="ml-auto text-sm text-ink-muted">{due.length}</span></div>
          {due.length === 0 && <p className="text-sm text-ink-muted">Nada pendiente esta semana.</p>}
          <ul className="divide-y divide-line">
            {due.slice(0, 30).map(({ r, d }) => (
              <li key={r.user_id + d.key} className="py-2 flex items-center gap-3 text-sm">
                <Link href={`/seguimiento/${r.user_id}`} className="flex-1 min-w-0 truncate hover:text-brand">{r.full_name || r.email}</Link>
                <span className="badge">{d.label}</span>
                <span className={`tabular-nums text-xs ${d.overdue ? "text-red-700" : "text-ink-faint"}`}>{d.overdue ? "atrasado · " : ""}{fmtDay(d.due.toISOString().slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5 space-y-3">
          <div className="flex items-center gap-2"><Clock size={18} className="text-brand" /><p className="font-semibold">7 días o más sin entrar</p><span className="ml-auto text-sm text-ink-muted">{inactive.length}</span></div>
          {inactive.length === 0 && <p className="text-sm text-ink-muted">Todos han entrado en la última semana.</p>}
          <ul className="divide-y divide-line">
            {inactive.slice(0, 30).map((r) => (
              <li key={r.user_id} className="py-2 flex items-center gap-3 text-sm">
                <Link href={`/seguimiento/${r.user_id}`} className="flex-1 min-w-0 truncate hover:text-brand">{r.full_name || r.email}</Link>
                <span className="text-xs text-ink-faint">{r.last_seen_at ? `hace ${r.inactive_days} días` : "nunca ha entrado"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={q({ mes: undefined })} className={chip(!sp.mes)}>Todos los meses</Link>
          {[1, 2, 3, 4, 5, 6].map((m) => <Link key={m} href={q({ mes: String(m) })} className={chip(sp.mes === String(m))}>Mes {m}</Link>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={q({ riesgo: sp.riesgo === "si" ? undefined : "si" })} className={chip(sp.riesgo === "si")}><AlertTriangle size={13} className="inline -mt-0.5" /> En riesgo</Link>
          {(["activo", "finalizado", "todos"] as const).map((e) => <Link key={e} href={q({ estado: e === "activo" ? undefined : e })} className={chip(estado === e)}>{e === "activo" ? "Activos" : e === "finalizado" ? "Finalizados" : "Todos"}</Link>)}
          <span className="ml-auto text-sm text-ink-muted">{list.length} alumnos</span>
        </div>

        <div className="card divide-y divide-line overflow-hidden">
          {list.length === 0 && <p className="p-6 text-sm text-ink-muted">Ningún alumno con estos filtros. Los alumnos nuevos entran aquí solos al darse de alta.</p>}
          {list.map((r) => (
            <Link key={r.user_id} href={`/seguimiento/${r.user_id}`} className="flex items-center gap-4 p-4 hover:bg-surface">
              <Avatar name={r.full_name} url={r.avatar_url} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium truncate">{r.full_name || r.email}</p>
                  <span className="badge !py-0.5">Mes {r.month}</span>
                  {r.at_risk && <span className="badge !py-0.5 !bg-red-50 !text-red-800" title={r.at_risk_manual !== null ? "marcado a mano" : r.risk_reason ?? ""}><AlertTriangle size={11} /> En riesgo</span>}
                  {r.status === "finalizado" && <span className="badge !py-0.5">Finalizado</span>}
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {r.progress_pct}% curso · {r.sessions} sesiones · {r.applications} aplicaciones · {r.active_projects} proyectos · {r.last_seen_at ? `entró ${timeAgo(r.last_seen_at)}` : "nunca ha entrado"}
                </p>
                {r.at_risk && <p className="text-xs text-red-700 mt-0.5">{r.at_risk_manual !== null ? "Marcado a mano" : r.risk_reason}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <StartFollowup students={notTracked} />
    </div>
  );
}
