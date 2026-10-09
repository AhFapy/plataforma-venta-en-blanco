"use server";

import { revalidatePath } from "next/cache";
import { requireMember, requireStaff } from "@/lib/auth";

export async function markNotificationsSeen() {
  const { supabase, profile } = await requireMember();
  await supabase.from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("id", profile.id);
  revalidatePath("/", "layout");
}

export async function createNotice(f: FormData): Promise<{ ok?: boolean; error?: string; msg?: string }> {
  const { supabase, profile } = await requireStaff();
  const title = String(f.get("title") ?? "").trim().slice(0, 140);
  const body = String(f.get("body") ?? "").trim().slice(0, 1000) || null;
  const link = String(f.get("link") ?? "").trim().slice(0, 300) || null;
  if (!title) return { error: "Falta el título" };
  const { error } = await supabase.from("notifications").insert({ kind: "aviso", title, body, link, created_by: profile.id });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, msg: "Aviso publicado" };
}

export async function deleteNotice(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("notifications").delete().eq("id", id);
  revalidatePath("/", "layout");
  return { ok: true };
}
