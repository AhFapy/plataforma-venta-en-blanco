"use server";

import { revalidatePath } from "next/cache";
import { requireCsm } from "@/lib/auth";

type R = { ok?: boolean; error?: string };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => { const v = parseInt(s(f, k), 10); return Number.isFinite(v) && v >= 0 ? v : 0; };

export async function saveFollowup(userId: string, f: FormData): Promise<R> {
  const { supabase } = await requireCsm();
  const risk = s(f, "at_risk_manual");
  const sessions = s(f, "sessions_manual");
  const revenue = Number(s(f, "revenue").replace(",", "."));
  const patch = {
    start_date: s(f, "start_date") || undefined,
    goals_3m: s(f, "goals_3m") || null,
    quick_wins: s(f, "quick_wins") || null,
    stage_goals: s(f, "stage_goals") || null,
    active_projects: int(f, "active_projects"),
    projects_notes: s(f, "projects_notes") || null,
    revenue: Number.isFinite(revenue) && revenue >= 0 ? revenue : 0,
    interviews: int(f, "interviews"),
    job_applications: int(f, "job_applications"),
    sessions_manual: sessions === "" ? null : int(f, "sessions_manual"),
    at_risk_manual: risk === "si" ? true : risk === "no" ? false : null,
    guarantee: s(f, "guarantee") === "si",
    testimonial: s(f, "testimonial") === "hecho" ? "hecho" : "pendiente",
    offboarding: ["pendiente", "agendado", "hecho"].includes(s(f, "offboarding")) ? s(f, "offboarding") : "pendiente",
    status: s(f, "status") === "finalizado" ? "finalizado" : "activo",
  };
  const { error } = await supabase.from("followups").update(patch).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/seguimiento", "layout");
  return { ok: true };
}

export async function addCheckin(userId: string, f: FormData): Promise<R> {
  const { supabase, profile } = await requireCsm();
  const notes = s(f, "notes");
  if (!notes) return { error: "Escribe las notas del check-in" };
  const { error } = await supabase.from("checkins").insert({
    user_id: userId, stage: s(f, "stage") || "extra", checkin_date: s(f, "checkin_date") || undefined, notes, author_id: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/seguimiento", "layout");
  return { ok: true };
}

export async function startFollowup(f: FormData): Promise<R> {
  const { supabase } = await requireCsm();
  const userId = s(f, "user_id");
  if (!userId) return { error: "Elige un alumno" };
  const { error } = await supabase.from("followups").insert({ user_id: userId, start_date: s(f, "start_date") || undefined });
  if (error) return { error: error.code === "23505" ? "Ya está en seguimiento" : error.message };
  revalidatePath("/seguimiento", "layout");
  return { ok: true };
}

export async function moderateTestimonial(id: string, action: "publicar" | "devolver" | "despublicar", note?: string): Promise<R> {
  const { supabase } = await requireCsm();
  const status = action === "publicar" ? "publicado" : action === "devolver" ? "borrador" : "enviado";
  const { error } = await supabase.from("testimonials").update({ status, review_note: note?.trim() || null }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/seguimiento", "layout");
  revalidatePath("/testimonios");
  return { ok: true };
}
