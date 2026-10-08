import { CalendarDays, PlayCircle, Video } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { fmtDateTime } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

export const metadata = { title: "Directos" };

export default async function Events() {
  const { supabase, profile } = await requireMember();
  const cutoff = new Date(Date.now() - 3 * 3600_000).toISOString();
  const [{ data: upcoming }, { data: past }, { data: att }] = await Promise.all([
    supabase.from("events").select("*").gte("starts_at", cutoff).order("starts_at").limit(20),
    supabase.from("events").select("*").lt("starts_at", cutoff).order("starts_at", { ascending: false }).limit(40),
    supabase.from("event_attendance").select("event_id").eq("user_id", profile.id),
  ]);
  const attended = new Set((att ?? []).map((a) => a.event_id));

  return (
    <div className="fade-in space-y-10">
      <PageHeader label="Directos" title="Sesiones" emphasis="en directo." />
      <section className="space-y-3">
        <p className="label">Próximas</p>
        {(upcoming as EventRow[] ?? []).length === 0 && <p className="text-ink-muted">No hay sesiones programadas.</p>}
        {(upcoming as EventRow[] ?? []).map((e, i) => (
          <article key={e.id} className={`rounded-[24px] p-6 flex flex-wrap items-center justify-between gap-4 ${i === 0 ? "on-dark bg-bg-dark text-[#f5f4ef]" : "card"}`}>
            <div className="flex items-start gap-4">
              <CalendarDays className={i === 0 ? "text-accent" : "text-brand"} />
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">{e.title}</h2>
                <p className={`text-sm capitalize ${i === 0 ? "text-[#a4a8a4]" : "text-ink-muted"}`}>{fmtDateTime(e.starts_at)} · hora España</p>
                {e.description && <p className={`text-sm mt-2 max-w-xl ${i === 0 ? "text-[#a4a8a4]" : "text-ink-muted"}`}>{e.description}</p>}
              </div>
            </div>
            {e.meeting_url && (
              <a href={e.meeting_url} target="_blank" rel="noreferrer" className={`btn ${i === 0 ? "bg-accent text-ink" : "btn-dark"}`}><Video size={16} /> Entrar</a>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <p className="label">Grabaciones</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {(past as EventRow[] ?? []).map((e) => (
            <article key={e.id} className="card p-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium truncate">{e.title}</h3>
                <p className="text-xs text-ink-faint capitalize">{fmtDateTime(e.starts_at)}{attended.has(e.id) ? " · asististe" : ""}</p>
              </div>
              {e.recording_url ? (
                <a href={e.recording_url} target="_blank" rel="noreferrer" className="btn btn-ghost !py-2 shrink-0"><PlayCircle size={15} /> Ver</a>
              ) : (
                <span className="text-xs text-ink-faint shrink-0">Sin grabación</span>
              )}
            </article>
          ))}
          {(past ?? []).length === 0 && <p className="text-ink-muted">Aún no hay grabaciones.</p>}
        </div>
      </section>
    </div>
  );
}
