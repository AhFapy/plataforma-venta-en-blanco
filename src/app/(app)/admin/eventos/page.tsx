import { requireStaff } from "@/lib/auth";
import type { EventRow } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { deleteRow, saveEvent } from "../actions";
import { ActionForm, DeleteButton } from "../ActionForm";
import { EventFields } from "../fields";
import { Attendance } from "./Attendance";

export const metadata = { title: "Directos" };

export default async function AdminEvents() {
  const { supabase } = await requireStaff();
  const [{ data: events }, { data: people }] = await Promise.all([
    supabase.from("events").select("*").order("starts_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("id,full_name").eq("active", true).eq("role", "alumno").order("full_name"),
  ]);
  // 10 sesiones × ~100 alumnos queda por debajo del límite de 1000 filas de la API
  const { data: att } = await supabase.from("event_attendance").select("event_id,user_id").in("event_id", (events ?? []).map((e) => e.id));
  const byEvent = new Map<string, string[]>();
  for (const a of att ?? []) byEvent.set(a.event_id, [...(byEvent.get(a.event_id) ?? []), a.user_id]);
  const now = Date.now();

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <p className="label mb-4">Nueva sesión</p>
        <ActionForm action={saveEvent} submit="Crear sesión" resetOnOk><EventFields /></ActionForm>
      </section>

      <div className="space-y-3">
        {((events ?? []) as EventRow[]).map((e) => {
          const past = new Date(e.starts_at).getTime() < now;
          return (
            <details key={e.id} className="card p-5">
              <summary className="cursor-pointer">
                <span className="font-medium">{e.title}</span>
                <span className="text-sm text-ink-muted ml-3 capitalize">{fmtDateTime(e.starts_at)}</span>
                {past && <span className="text-xs text-ink-faint ml-3">{byEvent.get(e.id)?.length ?? 0} asistentes{e.recording_url ? "" : " · sin grabación"}</span>}
              </summary>
              <div className="mt-5 space-y-6">
                <ActionForm action={saveEvent}><EventFields e={e} /></ActionForm>
                {past && <Attendance eventId={e.id} people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name || "—" }))} initial={byEvent.get(e.id) ?? []} />}
                <DeleteButton onDelete={deleteRow.bind(null, "events", e.id)} label="Borrar sesión" />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
