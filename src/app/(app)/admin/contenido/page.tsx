import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import type { Course } from "@/lib/types";
import { saveCourse } from "../actions";
import { ActionForm } from "../ActionForm";
import { CourseFields } from "../fields";

export const metadata = { title: "Contenido" };

export default async function AdminContent() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("courses").select("*, modules(id, lessons(id))").order("position");
  const courses = (data ?? []) as (Course & { modules: { id: string; lessons: { id: string }[] }[] })[];

  return (
    <div className="space-y-8">
      <div className="card divide-y divide-line">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/contenido/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-bg-badge/50">
            <div>
              <p className="font-medium">{c.position}. {c.title}</p>
              <p className="text-xs text-ink-faint">{c.modules.length} módulos · {c.modules.reduce((a, m) => a + m.lessons.length, 0)} lecciones</p>
            </div>
            <span className="badge">{c.published ? "Publicado" : "Borrador"}</span>
          </Link>
        ))}
        {courses.length === 0 && <p className="p-5 text-ink-muted">No hay cursos. Crea el primero abajo.</p>}
      </div>

      <section className="card p-6">
        <p className="label mb-4">Nuevo curso</p>
        <ActionForm action={saveCourse} submit="Crear curso" resetOnOk><CourseFields /></ActionForm>
      </section>
    </div>
  );
}
