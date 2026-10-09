"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";

export async function completeMission(missionId: string) {
  const { supabase, profile } = await requireMember();
  const { error } = await supabase.from("mission_completions").insert({ mission_id: missionId, user_id: profile.id });
  if (error && !/duplicate/i.test(error.message)) return { error: "No se ha podido completar" };
  revalidatePath("/", "layout");
  return { ok: true };
}
