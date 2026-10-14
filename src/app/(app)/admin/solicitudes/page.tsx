import { requireStaff } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { RequestActions } from "./RequestActions";

export const metadata = { title: "Solicitudes de acceso" };

type Req = { id: string; email: string; full_name: string; phone: string | null; status: string; created_at: string; decided_at: string | null };

export default async function Requests() {
  const { supabase } = await requireStaff();
  const [{ data: pend }, { data: done }] = await Promise.all([
    supabase.from("access_requests").select("id,email,full_name,phone,status,created_at,decided_at").eq("status", "pendiente").order("created_at", { ascending: true }),
    supabase.from("access_requests").select("id,email,full_name,phone,status,created_at,decided_at").neq("status", "pendiente").order("decided_at", { ascending: false }).limit(30),
  ]);
  const pending = (pend ?? []) as Req[];
  const decided = (done ?? []) as Req[];
  const link = "https://plataforma-venta-en-blanco-trud-sales.vercel.app/solicitar-acceso";

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Solicitudes de acceso</h1>
        <p className="text-sm text-ink-muted">Los alumnos las envían desde <span className="font-mono text-xs break-all">{link}</span>. Al aceptar se le da de alta y ya puede entrar con su email.</p>
      </div>

      <section className="card divide-y divide-line">
        {pending.length === 0 && <p className="p-6 text-sm text-ink-muted">No hay solicitudes pendientes.</p>}
        {pending.map((r) => (
          <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="font-medium">{r.full_name}</p>
              <p className="text-sm text-ink-muted break-all">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
              <p className="text-xs text-ink-faint">{timeAgo(r.created_at)}</p>
            </div>
            <RequestActions id={r.id} name={r.full_name} phone={r.phone} />
          </div>
        ))}
      </section>

      {decided.length > 0 && (
        <section className="space-y-3">
          <p className="label">Resueltas</p>
          <div className="card divide-y divide-line">
            {decided.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-ink-muted break-all">{r.email}</p>
                </div>
                <span className={`badge ${r.status === "aceptada" ? "!bg-brand !text-white" : ""}`}>{r.status === "aceptada" ? "Aceptada" : "Rechazada"}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
