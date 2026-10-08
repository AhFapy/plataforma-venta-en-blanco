import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import type { Course, Lesson, LessonMedia, Module } from "@/lib/types";
import { deleteRow, saveCourse, saveLesson, saveModule } from "../../actions";
import { ActionForm, DeleteButton } from "../../ActionForm";
import { CourseFields, LessonFields, ModuleFields } from "../../fields";

export default async function AdminCourse({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase } = await requireStaff();
  const [{ data: course }, { data: mods }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle<Course>(),
    supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select("*, modules!inner(course_id)").eq("modules.course_id", courseId).order("position"),
  ]);
  if (!course) notFound();
  const modules = (mods ?? []) as Module[];
  const ls = (lessons ?? []) as Lesson[];
  const { data: mediaRows } = await supabase.from("lesson_media").select("*").in("lesson_id", ls.map((l) => l.id));
  const media = new Map(((mediaRows ?? []) as LessonMedia[]).map((m) => [m.lesson_id, m]));

  return (
    <div className="space-y-8">
      <Link href="/admin/contenido" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Contenido</Link>

      <details className="card p-6">
        <summary className="cursor-pointer text-2xl font-semibold tracking-[-0.03em]">{course.title} <span className="text-sm font-normal text-ink-muted ml-2">editar curso</span></summary>
        <div className="mt-6">
          <ActionForm action={saveCourse}><CourseFields c={course} /></ActionForm>
          <div className="mt-4"><DeleteButton onDelete={deleteRow.bind(null, "courses", course.id)} label="Borrar curso entero" confirmText="Se borran el curso, sus módulos, lecciones y el progreso de los alumnos. ¿Seguro?" /></div>
        </div>
      </details>

      {modules.map((m, i) => {
        const ml = ls.filter((l) => l.module_id === m.id);
        return (
          <section key={m.id} className="card p-6 space-y-4">
            <details>
              <summary className="cursor-pointer flex-wrap">
                <span className="text-brand font-semibold mr-2">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-lg font-semibold">{m.title}</span>
                <span className="ml-3 text-xs text-ink-faint">
                  {m.unlock_mode !== "libre" && <Lock size={11} className="inline mr-1" />}
                  {m.unlock_mode === "libre" ? "Libre" : m.unlock_mode === "progreso" ? "Tras el anterior" : `Día ${m.unlock_after_days}`} · editar módulo
                </span>
              </summary>
              <div className="mt-4">
                <ActionForm action={saveModule}><ModuleFields courseId={course.id} m={m} /></ActionForm>
                <div className="mt-3"><DeleteButton onDelete={deleteRow.bind(null, "modules", m.id)} label="Borrar módulo" confirmText="Se borran el módulo y sus lecciones. ¿Seguro?" /></div>
              </div>
            </details>

            <ul className="divide-y divide-line border-t border-line">
              {ml.map((l) => (
                <li key={l.id}>
                  <details className="py-3">
                    <summary className="cursor-pointer text-[15px]">
                      {l.position}. {l.title}
                      {!media.get(l.id)?.video_url && <span className="badge !py-0 ml-2 !text-[10px] !bg-red-50 !text-red-800">sin vídeo</span>}
                      {!l.published && <span className="badge !py-0 ml-2 !text-[10px]">oculta</span>}
                    </summary>
                    <div className="mt-4 pl-2">
                      <ActionForm action={saveLesson}><LessonFields moduleId={m.id} l={l} media={media.get(l.id)} /></ActionForm>
                      <div className="mt-3"><DeleteButton onDelete={deleteRow.bind(null, "lessons", l.id)} label="Borrar lección" /></div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <details className="rounded-[14px] bg-bg p-4">
              <summary className="cursor-pointer text-sm font-medium">+ Añadir lección</summary>
              <div className="mt-4">
                <ActionForm action={saveLesson} submit="Añadir lección" resetOnOk>
                  <LessonFields moduleId={m.id} nextPos={(ml.at(-1)?.position ?? 0) + 1} />
                </ActionForm>
              </div>
            </details>
          </section>
        );
      })}

      <section className="card p-6">
        <p className="label mb-4">Nuevo módulo</p>
        <ActionForm action={saveModule} submit="Crear módulo" resetOnOk>
          <ModuleFields courseId={course.id} nextPos={(modules.at(-1)?.position ?? 0) + 1} />
        </ActionForm>
      </section>
    </div>
  );
}
