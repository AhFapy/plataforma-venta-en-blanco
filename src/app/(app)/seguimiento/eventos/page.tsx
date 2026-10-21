import Link from "next/link";
import { requireCsm } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { NewEvent } from "./NewEvent";

export const metadata = { title: "Eventos presenciales · Seguimiento" };

export default async function CsmEvents() {
  const { supabase } = await requireCsm();
  const [{ data: evs }, { data: att }] = await Promise.all([
    supabase.from("csm_events").select("id,title,event_date").order("event_date", { ascending: false, nullsFirst: false }),
    supabase.from("csm_event_attendance").select("event_id,user_id,who:profiles!csm_event_attendance_user_id_fkey(full_name)"),
  ]);
  type A = { event_id: string; user_id: string; who: { full_name: string | null } | null };
  const byEvent = new Map<string, A[]>();
  for (const a of (att ?? []) as unknown as A[]) byEvent.set(a.event_id, [...(byEvent.get(a.event_id) ?? []), a]);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Eventos" emphasis="presenciales." />
      <p className="text-sm text-ink-muted">Crea aquí los eventos (julio, diciembre, Sales Summit…). La asistencia se marca en la ficha de cada alumno.</p>
      <NewEvent />
      <div className="space-y-3">
        {(evs ?? []).map((e) => {
          const list = byEvent.get(e.id as string) ?? [];
          return (
            <section key={e.id as string} className="card p-5 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{e.title as string}</p>
                <p className="text-sm text-ink-muted">{e.event_date ? new Date(e.event_date + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "Sin fecha"} · {list.length} asistentes</p>
              </div>
              {list.length > 0 && (
                <p className="text-sm">{list.map((a, i) => <span key={a.user_id}>{i > 0 && ", "}<Link href={`/seguimiento/${a.user_id}`} className="hover:text-brand">{a.who?.full_name ?? "—"}</Link></span>)}</p>
              )}
            </section>
          );
        })}
        {!evs?.length && <p className="text-sm text-ink-muted">Todavía no hay eventos.</p>}
      </div>
    </div>
  );
}
