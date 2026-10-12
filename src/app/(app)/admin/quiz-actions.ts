"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";

type R = { ok?: boolean; error?: string };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveQuizQuestion(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  const options = [0, 1, 2, 3, 4, 5].map((i) => s(f, `opt${i}`)).filter(Boolean);
  const correctRaw = Number(s(f, "correct"));
  // "correct" apunta al hueco del formulario; recalcular sobre las opciones no vacías
  const filled = [0, 1, 2, 3, 4, 5].filter((i) => s(f, `opt${i}`));
  const correct = filled.indexOf(correctRaw);
  const row = {
    module_id: s(f, "module_id"),
    position: Number(s(f, "position")) || 1,
    question: s(f, "question"),
    options,
    correct,
    explanation: s(f, "explanation") || null,
  };
  if (!row.question) return { error: "Falta la pregunta" };
  if (options.length < 2) return { error: "Pon al menos 2 respuestas" };
  if (correct < 0) return { error: "Marca cuál es la correcta" };
  const { error } = id
    ? await supabase.from("quiz_questions").update(row).eq("id", id)
    : await supabase.from("quiz_questions").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteQuizQuestion(id: string): Promise<R> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
