"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { enrollStudent } from "@/lib/enroll";
import { createAdminClient } from "@/lib/supabase/admin";

type R = { ok?: boolean; error?: string; profileId?: string };

export async function decideRequest(id: string, accept: boolean): Promise<R> {
  const { profile } = await requireStaff();
  const admin = createAdminClient();
  const { data: req } = await admin.from("access_requests").select("*").eq("id", id).maybeSingle();
  if (!req) return { error: "No existe" };
  if (req.status !== "pendiente") return { error: "Ya estaba resuelta" };

  let profileId: string | null = null;
  if (accept) {
    try {
      const r = await enrollStudent({ email: req.email, full_name: req.full_name, phone: req.phone ?? undefined, cohort: new Date().toISOString().slice(0, 7) });
      profileId = r.id;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo dar de alta" };
    }
  }
  const { error } = await admin.from("access_requests").update({
    status: accept ? "aceptada" : "rechazada", decided_at: new Date().toISOString(), decided_by: profile.id, profile_id: profileId,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, profileId: profileId ?? undefined };
}
