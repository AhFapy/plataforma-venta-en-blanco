import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getStudents } from "./students";
import { NoticeForm } from "./NoticeForm";
import { DeleteButton } from "./ActionForm";
import { deleteNotice } from "@/app/notification-actions";
import { getNotifications } from "@/lib/notifications";
import { timeAgo } from "@/lib/utils";
import { getServiceMetrics } from "./metrics";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const { supabase } = await requireStaff();
  const students = (await getStudents(supabase)).filter((s) => s.role === "alumno" && s.active);
  const risk = students.filter((s) => s.risk);
  const settings = await getSettings(supabase);
  const [notes, metrics] = await Promise.all([getNotifications(supabase, 8), getServiceMetrics(supabase, students, settings.mentoria_points)]);

  return (
    <div className="space-y-8">
      <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.035em]">Cómo van <span className="em">los alumnos.</span></h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="card p-5">
            <p className="label mb-2 leading-snug">{m.label}</p>
            <p className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              {m.value}
              {m.of > 0 && <span className="text-base text-ink-faint font-normal"> / {m.of} · {Math.round((m.value / m.of) * 100)}%</span>}
            </p>
            <p className="text-xs text-ink-faint mt-1">{m.hint}</p>
          </div>
        ))}
      </div>

      <section className="card p-6">
        <p className="label mb-1">Publicar un aviso</p>
        <p className="text-sm text-ink-muted mb-4">Sale en las novedades de Inicio y en la campana de todos los alumnos. Las clases, cursos, directos y anuncios nuevos se avisan solos.</p>
        <NoticeForm />
        {notes.length > 0 && (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="flex-1 min-w-0 truncate">{n.title}</span>
                <span className="text-ink-faint shrink-0">{timeAgo(n.created_at)}</span>
                <DeleteButton onDelete={deleteNotice.bind(null, n.id)} label="Quitar" confirmText="¿Quitar esta novedad?" />
              </li>
            ))}
          </ul>
        )}
      </section>

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
