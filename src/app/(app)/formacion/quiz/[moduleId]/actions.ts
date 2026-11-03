"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import type { NewBadge } from "@/lib/entrena/types";

export type QuizResult = { score: number; total: number; passed: boolean; first_pass: boolean; results: { id: string; ok: boolean; correct: number; explanation: string | null }[]; badges?: NewBadge[] };

export async function checkAnswer(questionId: string, answer: number) {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("quiz_check", { p_question: questionId, p_answer: answer });
  if (error) return { error: "No se ha podido comprobar. Inténtalo de nuevo." };
  return { data: data as { ok: boolean; correct: number; explanation: string | null } };
}

export async function submitQuiz(moduleId: string, answers: number[]): Promise<{ error?: string; result?: QuizResult }> {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("submit_quiz", { p_module: moduleId, p_answers: answers.map((a) => (Number.isInteger(a) ? a : -1)) });
  if (error) return { error: "No se ha podido corregir. Inténtalo de nuevo." };
  revalidatePath("/", "layout");
  return { result: data as QuizResult };
}
