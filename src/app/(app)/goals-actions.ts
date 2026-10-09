"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const STEP = 10;

/** Suma o resta avance (de 10 en 10) a un objetivo o punto de mejora. El primer avance del día da +2 puntos. */
export async function logGoalProgress(kind: "objective" | "improvement", index: number, direction: 1 | -1) {
  const { supabase, profile } = await requireMember();
  if (![0, 1, 2].includes(index) || ![1, -1].includes(direction)) return { error: "Datos no válidos" };
  const col = kind === "objective" ? "objectives_progress" : "improvements_progress";
  const current = [...((kind === "objective" ? profile.objectives_progress : profile.improvements_progress) ?? [0, 0, 0])];
  while (current.length < 3) current.push(0);
  const before = current[index] ?? 0;
  current[index] = Math.max(0, Math.min(100, before + direction * STEP));
  if (current[index] === before) return { ok: true, value: before, awarded: false };
  const { error } = await supabase.from("profile_private").update({ [col]: current }).eq("id", profile.id);
  if (error) return { error: "No se ha podido guardar" };

  let awarded = false;
  if (direction === 1) {
    const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
    // Puntos con service role: los alumnos no pueden darse puntos por su cuenta. Uno por día como máximo.
    const { error: pErr } = await createAdminClient()
      .from("point_events")
      .insert({ user_id: profile.id, kind: "avance", points: 2, ref: day });
    awarded = !pErr;
  }
  revalidatePath("/");
  return { ok: true, value: current[index], awarded };
}
