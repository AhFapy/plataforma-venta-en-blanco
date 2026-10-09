import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Download, Lock } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { videoEmbed } from "@/lib/utils";
import type { LessonMedia } from "@/lib/types";
import { CompleteButton } from "./CompleteButton";
import { HomeworkBox, type MySubmission } from "@/components/HomeworkBox";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireMember();
  const cur = await getCurriculum(supabase, profile);
  const idx = cur.ordered.findIndex((l) => l.id === id);
  if (idx < 0) notFound();
  const lesson = cur.ordered[idx];
  const st = cur.states.get(lesson.module_id)!;

  if (!st.unlocked) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-5">
        <Lock className="mx-auto text-ink-faint" />
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Lección <span className="em">bloqueada</span></h1>
        <p className="text-ink-muted">{st.reason}.</p>
        <Link href={`/formacion/${lesson.course.id}`} className="btn btn-dark">Volver al curso</Link>
      </div>
    );
  }

  const sameCourse = cur.ordered.filter((l) => l.course.id === lesson.course.id);
  const pos = sameCourse.findIndex((l) => l.id === id);
  const prev = sameCourse[pos - 1];
  const next = sameCourse[pos + 1];
  const nextOpen = next && cur.states.get(next.module_id)?.unlocked;
  const moduleLessons = cur.lessons.filter((l) => l.module_id === lesson.module_id);
  // Registro de visualización (métricas del equipo)
  await supabase.from("lesson_views").upsert({ user_id: profile.id, lesson_id: lesson.id, viewed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
  const [{ data: media }, { data: subRow }] = await Promise.all([
    supabase.from("lesson_media").select("*").eq("lesson_id", lesson.id).maybeSingle<LessonMedia>(),
    supabase.from("submissions").select("body,file_path,file_name,feedback,feedback_at,updated_at").eq("user_id", profile.id).eq("lesson_id", lesson.id).maybeSingle(),
  ]);
  let sub: MySubmission = null;
  if (subRow) {
    const signed = subRow.file_path ? (await supabase.storage.from("deberes").createSignedUrl(subRow.file_path, 3600)).data?.signedUrl ?? null : null;
    sub = { body: subRow.body, file_name: subRow.file_name, file_url: signed, feedback: subRow.feedback, feedback_at: subRow.feedback_at, updated_at: subRow.updated_at };
  }
  const resources = media?.resources ?? [];
  const done = cur.completed.has(lesson.id);
  const embed = videoEmbed(media?.video_url);

  return (
    <div className="fade-in grid xl:grid-cols-[1fr_300px] gap-8">
      <div className="space-y-6 min-w-0">
        <Link href={`/formacion/${lesson.course.id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> {lesson.course.title}
        </Link>

        {embed && (
          <div className="aspect-video w-full overflow-hidden rounded-[24px] bg-bg-dark">
            {embed.kind === "iframe" ? (
              <iframe src={embed.src} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="lazy" title={lesson.title} />
            ) : (
              <video src={embed.src} controls controlsList="nodownload" className="h-full w-full" />
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label mb-2">{lesson.module.title}</p>
            <h1 className="text-[28px] sm:text-[36px] leading-[1.1] font-semibold tracking-[-0.03em]">{lesson.title}</h1>
          </div>
          <CompleteButton lessonId={lesson.id} done={done} nextHref={nextOpen ? `/formacion/leccion/${next.id}` : null} />
        </div>

        {lesson.description && <div className="text-[16px] leading-relaxed text-ink/85 whitespace-pre-line max-w-3xl">{lesson.description}</div>}

        {resources.length > 0 && (
          <section className="card p-6">
            <p className="label mb-4">Recursos</p>
            <ul className="space-y-2">
              {resources.map((r, i) => (
                <li key={i}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-brand"><Download size={15} /> {r.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <HomeworkBox lessonId={lesson.id} userId={profile.id} sub={sub} />

        <div className="flex justify-between gap-3 pt-4 border-t border-line">
          {prev ? <Link href={`/formacion/leccion/${prev.id}`} className="btn btn-ghost"><ArrowLeft size={15} /> Anterior</Link> : <span />}
          {next && (nextOpen
            ? <Link href={`/formacion/leccion/${next.id}`} className="btn btn-dark">Siguiente <ArrowRight size={15} /></Link>
            : <span className="btn btn-ghost opacity-60"><Lock size={14} /> Siguiente bloqueada</span>)}
        </div>
      </div>

      <aside className="card p-5 h-fit xl:sticky xl:top-10">
        <p className="label mb-3">{lesson.module.title}</p>
        <ul className="space-y-1">
          {moduleLessons.map((l) => (
            <li key={l.id}>
              <Link href={`/formacion/leccion/${l.id}`} className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-sm ${l.id === lesson.id ? "bg-ink text-bg" : "hover:bg-bg-badge"}`}>
                {cur.completed.has(l.id) ? <CheckCircle2 size={15} className={l.id === lesson.id ? "text-accent" : "text-brand"} /> : <Circle size={15} className="text-ink-faint" />}
                <span className="line-clamp-2">{l.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
