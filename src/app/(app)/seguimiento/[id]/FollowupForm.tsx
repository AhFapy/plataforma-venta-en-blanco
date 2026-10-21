"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFollowup } from "../actions";

type F = {
  start_date: string; goals_3m: string | null; quick_wins: string | null; stage_goals: string | null;
  active_projects: number; projects_notes: string | null; revenue: number; interviews: number; job_applications: number;
  sessions_manual: number | null; at_risk_manual: boolean | null; guarantee: boolean; testimonial: string; offboarding: string; status: string;
  onboarding_done: boolean; notes: string | null; objective_due: string | null; objective_met: boolean; objective_met_at: string | null;
};

const L = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block space-y-1.5">
    <span className="text-sm text-ink-muted">{label}</span>
    {children}
    {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
  </label>
);

export function FollowupForm({ userId, f, sessionsRecorded, autoRisk }: { userId: string; f: F; sessionsRecorded: number; autoRisk: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => { const r = await saveFollowup(userId, fd); setMsg(r.error ?? "Guardado"); if (r.ok) router.refresh(); });
      }}
    >
      <section className="card p-6 space-y-5">
        <p className="label">Objetivos</p>
        <L label="Objetivo a 3 meses (onboarding con Javi)"><textarea name="goals_3m" className="input min-h-20" defaultValue={f.goals_3m ?? ""} placeholder="Ej.: Recuperar la inversión (generar 2.000 €)" /></L>
        <div className="grid sm:grid-cols-3 gap-4">
          <L label="Onboarding con Javi"><select name="onboarding_done" className="input" defaultValue={f.onboarding_done ? "si" : "no"}><option value="no">Pendiente</option><option value="si">Hecho</option></select></L>
          <L label="Fecha objetivo"><input name="objective_due" type="date" className="input" defaultValue={f.objective_due ?? ""} /></L>
          <L label="Objetivo cumplido" hint={f.objective_met && f.objective_met_at ? `Cumplido el ${new Date(f.objective_met_at + "T12:00:00Z").toLocaleDateString("es-ES")}` : undefined}>
            <select name="objective_met" className="input" defaultValue={f.objective_met ? "si" : "no"}><option value="no">No</option><option value="si">Sí</option></select>
          </L>
        </div>
        <L label="Quick wins de la semana 1"><textarea name="quick_wins" className="input min-h-20" defaultValue={f.quick_wins ?? ""} /></L>
        <L label="Objetivos de cada etapa"><textarea name="stage_goals" className="input min-h-24" defaultValue={f.stage_goals ?? ""} placeholder={"Mes 1: …\nMes 2: …"} /></L>
      </section>

      <section className="card p-6 space-y-5">
        <p className="label">Resultados (se actualizan en cada check-in)</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <L label="Proyectos activos"><input name="active_projects" type="number" min={0} className="input" defaultValue={f.active_projects} /></L>
          <L label="Facturación (€)"><input name="revenue" inputMode="decimal" className="input" defaultValue={f.revenue} /></L>
          <L label="Entrevistas"><input name="interviews" type="number" min={0} className="input" defaultValue={f.interviews} /></L>
          <L label="Aplicaciones a ofertas"><input name="job_applications" type="number" min={0} className="input" defaultValue={f.job_applications} /></L>
        </div>
        <L label="Proyectos (detalle)"><textarea name="projects_notes" className="input min-h-20" defaultValue={f.projects_notes ?? ""} /></L>
        <div className="grid sm:grid-cols-2 gap-4">
          <L label="Sesiones de grupo" hint={`Registradas en Directos: ${sessionsRecorded}. Déjalo vacío para usar ese número.`}>
            <input name="sessions_manual" type="number" min={0} className="input" defaultValue={f.sessions_manual ?? ""} placeholder={String(sessionsRecorded)} />
          </L>
          <L label="Fecha de entrada"><input name="start_date" type="date" className="input" defaultValue={f.start_date} /></L>
        </div>
      </section>

      <section className="card p-6 space-y-5">
        <p className="label">Estado</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <L label="En riesgo" hint={autoRisk ? `Automático: sí (${autoRisk})` : "Automático: no"}>
            <select name="at_risk_manual" className="input" defaultValue={f.at_risk_manual === null ? "auto" : f.at_risk_manual ? "si" : "no"}>
              <option value="auto">Automático</option><option value="si">Sí (a mano)</option><option value="no">No (a mano)</option>
            </select>
          </L>
          <L label="Garantía"><select name="guarantee" className="input" defaultValue={f.guarantee ? "si" : "no"}><option value="no">No</option><option value="si">Sí</option></select></L>
          <L label="Testimonio"><select name="testimonial" className="input" defaultValue={f.testimonial}><option value="pendiente">Pendiente</option><option value="hecho">Hecho</option></select></L>
          <L label="Offboarding con Javi"><select name="offboarding" className="input" defaultValue={f.offboarding}><option value="pendiente">Pendiente</option><option value="agendado">Agendado</option><option value="hecho">Hecho</option></select></L>
          <L label="Estado"><select name="status" className="input" defaultValue={f.status}><option value="activo">Activo</option><option value="finalizado">Finalizado</option></select></L>
        </div>
      </section>

      <section className="card p-6 space-y-3">
        <p className="label">Notas y observaciones</p>
        <textarea name="notes" className="input min-h-28" defaultValue={f.notes ?? ""} placeholder="Lo que haya que tener presente de este alumno (no sustituye a los check-ins)" />
      </section>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-dark">{pending ? "Guardando…" : "Guardar ficha"}</button>
        {msg && <span className="text-sm text-ink-muted">{msg}</span>}
      </div>
    </form>
  );
}
