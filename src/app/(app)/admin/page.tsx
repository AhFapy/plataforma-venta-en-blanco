import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getStudents } from "./students";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const { supabase } = await requireStaff();
  const students = (await getStudents(supabase)).filter((s) => s.role === "alumno" && s.active);
  const week = Date.now() - 7 * 86_400_000;
  const active7 = students.filter((s) => s.last_seen_at && new Date(s.last_seen_at).getTime() > week).length;
  const onboarded = students.filter((s) => s.onboarded_at).length;
  const avg = students.length ? students.reduce((a, s) => a + (s.total ? s.done / s.total : 0), 0) / students.length : 0;
  const risk = students.filter((s) => s.risk);

  return (
    <div className="space-y-8">
      <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.035em]">Cómo van <span className="em">los alumnos.</span></h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Alumnos activos", students.length],
          ["Entraron últimos 7 días", `${active7} · ${students.length ? Math.round((active7 / students.length) * 100) : 0}%`],
          ["Perfil completado", `${onboarded}/${students.length}`],
          ["Progreso medio", `${Math.round(avg * 100)}%`],
        ].map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="label mb-2">{k}</p>
            <p className="text-2xl font-semibold tracking-[-0.02em]">{v}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <p className="label">En riesgo · {risk.length}</p>
          <Link href="/admin/alumnos" className="text-sm text-ink-muted underline">Todos los alumnos</Link>
        </div>
        <div className="card divide-y divide-line">
          {risk.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Link href={`/miembros/${s.id}`} className="font-medium flex-1 min-w-40">{s.full_name || s.email}</Link>
              <span className="badge !bg-red-50 !text-red-800">{s.risk}</span>
              <span className="text-sm text-ink-muted tabular-nums w-24 text-right">{s.done}/{s.total} lecc.</span>
              {s.phone && (
                <a href={`https://wa.me/${s.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-brand" title="WhatsApp"><MessageCircle size={18} /></a>
              )}
            </div>
          ))}
          {risk.length === 0 && <p className="p-5 text-ink-muted">Nadie en riesgo ahora mismo.</p>}
        </div>
      </section>
    </div>
  );
}
