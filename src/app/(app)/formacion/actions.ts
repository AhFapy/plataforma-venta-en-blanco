"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";

export async function setLessonComplete(lessonId: string, complete: boolean) {
  const { supabase, profile } = await requireMember();
  if (complete) {
    // No se puede completar una lección de un módulo bloqueado
    const cur = await getCurriculum(supabase, profile);
    const lesson = cur.lessons.find((l) => l.id === lessonId);
    if (!lesson || !cur.states.get(lesson.module_id)?.unlocked) return { error: "Lección bloqueada" };
    await supabase.from("lesson_progress").upsert({ user_id: profile.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
  } else {
    await supabase.from("lesson_progress").delete().eq("user_id", profile.id).eq("lesson_id", lessonId);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
