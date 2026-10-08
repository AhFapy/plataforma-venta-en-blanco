import { requireStaff } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/utils";
import { getStudents } from "../students";
import { inviteStudents } from "../actions";
import { ActionForm, Field } from "../ActionForm";
import { MemberControls } from "./MemberControls";

export const metadata = { title: "Alumnos" };

export default async function AdminStudents({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const { q, c } = await searchParams;
  const { supabase, profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const all = await getStudents(supabase);
  let rows = all;
  if (q) { const t = q.toLowerCase(); rows = rows.filter((r) => (r.full_name ?? "").toLowerCase().includes(t) || r.email.includes(t)); }
  if (c) rows = rows.filter((r) => r.cohort === c);
  const cohorts = [...new Set(all.map((r) => r.cohort).filter(Boolean))].sort().reverse() as string[];

  return (
    <div className="space-y-8">
      {isAdmin && (
        <section className="card p-6">
          <p className="label mb-4">Dar de alta alumnos</p>
          <ActionForm action={inviteStudents} submit="Dar de alta" resetOnOk>
            <div className="grid sm:grid-cols-[1fr_200px] gap-4">
              <Field label="Uno por línea: email, nombre, teléfono" hint="Nombre y teléfono opcionales. Entran con código al email; no se les envía nada automáticamente.">
                <textarea name="lines" className="input min-h-28 font-mono text-sm" placeholder={"ana@email.com, Ana López, +34600000000\njuan@email.com"} />
              </Field>
              <Field label="Promoción" hint="Por defecto, el mes actual">
                <input name="cohort" className="input" placeholder={new Date().toISOString().slice(0, 7)} />
              </Field>
            </div>
          </ActionForm>
        </section>
      )}

      <form className="flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Buscar nombre o email" className="input !w-64" />
        <select name="c" defaultValue={c ?? ""} className="input !w-44">
          <option value="">Todas las promociones</option>
          {cohorts.map((co) => <option key={co}>{co}</option>)}
        </select>
        <button className="btn btn-ghost">Filtrar</button>
        <span className="self-center text-sm text-ink-muted">{rows.length} personas</span>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="text-left">
            <tr className="border-b border-line">
              {["Alumno", "Promoción", "Alta", "Última vez", "Progreso", "Puntos", ""].map((h) => <th key={h} className="label font-normal px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.full_name || "—"} {r.role !== "alumno" && <span className="badge !py-0 !text-[10px] ml-1">{r.role}</span>}</p>
                  <p className="text-xs text-ink-faint">{r.email}</p>
                  {r.risk && <p className="text-xs text-red-700 mt-0.5">{r.risk}</p>}
                </td>
                <td className="px-4 py-3">{r.cohort ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.enrolled_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.last_seen_at ? timeAgo(r.last_seen_at) : "Nunca"}</td>
                <td className="px-4 py-3 tabular-nums">{r.done}/{r.total}</td>
                <td className="px-4 py-3 tabular-nums">{r.points}</td>
                <td className="px-4 py-3"><MemberControls id={r.id} active={r.active} role={r.role} cohort={r.cohort} isAdmin={isAdmin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
