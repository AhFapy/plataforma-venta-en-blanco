"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type R = { ok?: boolean; error?: string; msg?: string };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const orNull = (v: string) => v || null;

/** Sube una imagen del equipo (pop-ups, misiones, foto de Rosa) y devuelve su URL pública. */
export async function uploadMedia(f: FormData): Promise<{ url?: string; error?: string }> {
  const { supabase } = await requireStaff();
  const file = f.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Elige una imagen" };
  if (file.size > 5 * 1024 * 1024) return { error: "Máximo 5 MB" };
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return { error: "Formato no válido" };
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) return { error: "No se ha podido subir" };
  return { url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl };
}

// ───── Misiones ─────
export async function saveMission(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  const cat = s(f, "category");
  const row = {
    category: (["redes", "apps", "otros"].includes(cat) ? cat : "redes") as "redes" | "apps" | "otros",
    title: s(f, "title"),
    description: orNull(s(f, "description")),
    image_url: orNull(s(f, "image_url")),
    link: orNull(s(f, "link")),
    cta: orNull(s(f, "cta")),
    points: Math.max(0, Math.min(1000, Math.round(Number(s(f, "points")) || 0))),
    position: Math.round(Number(s(f, "position")) || 0),
    active: f.get("active") === "on",
  };
  if (!row.title) return { error: "Falta el título" };
  const { error } = id ? await supabase.from("missions").update(row).eq("id", id) : await supabase.from("missions").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMission(id: string): Promise<R> {
  const { supabase } = await requireStaff();
  await supabase.from("missions").delete().eq("id", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ───── Pop-ups ─────
function madridToUtc(local: string) {
  const asUtc = new Date(local + ":00Z");
  const madrid = new Date(asUtc.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() - (madrid.getTime() - utc.getTime())).toISOString();
}

export async function savePopup(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  const starts = s(f, "starts_at");
  const ends = s(f, "ends_at");
  const row = {
    title: s(f, "title"),
    body: orNull(s(f, "body")),
    image_url: orNull(s(f, "image_url")),
    cta_label: orNull(s(f, "cta_label")),
    link: orNull(s(f, "link")),
    starts_at: starts ? madridToUtc(starts) : new Date().toISOString(),
    ends_at: ends ? madridToUtc(ends) : null,
    active: f.get("active") === "on",
  };
  if (!row.title) return { error: "Falta el título" };
  if (row.ends_at && row.ends_at <= row.starts_at) return { error: "La fecha de fin tiene que ser posterior al inicio" };
  const { error } = id ? await supabase.from("popups").update(row).eq("id", id) : await supabase.from("popups").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePopup(id: string): Promise<R> {
  const { supabase } = await requireStaff();
  await supabase.from("popups").delete().eq("id", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ───── Ajustes ─────
export async function saveSettings(f: FormData): Promise<R> {
  const { supabase } = await requireAdmin();
  const keys = ["rosa_name", "rosa_avatar_url", "trustpilot_url", "mentoria_points", "mentoria_url"];
  const rows = keys.map((key) => ({ key, value: orNull(s(f, key)) }));
  const pts = Number(rows.find((r) => r.key === "mentoria_points")?.value);
  if (!Number.isFinite(pts) || pts < 50) return { error: "Los puntos de la mentoría tienen que ser 50 o más" };
  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, msg: "Guardado" };
}

// ───── Biblioteca de recursos (Hoja en Blanco) ─────
export async function saveResource(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  const url = s(f, "url");
  const row = {
    category: s(f, "category") || "General",
    title: s(f, "title"),
    description: orNull(s(f, "description")),
    url: url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : null,
    file_path: orNull(s(f, "file_path")),
    file_name: orNull(s(f, "file_name")),
    position: Math.round(Number(s(f, "position")) || 0),
  };
  if (!row.title) return { error: "Falta el título" };
  if (!row.url && !row.file_path) return { error: "Pon un enlace o sube un archivo" };
  let oldPath: string | null = null;
  if (id) {
    const { data } = await supabase.from("library_resources").select("file_path").eq("id", id).maybeSingle();
    oldPath = data?.file_path ?? null;
  }
  const { error } = id ? await supabase.from("library_resources").update(row).eq("id", id) : await supabase.from("library_resources").insert(row);
  if (error) return { error: error.message };
  if (oldPath && oldPath !== row.file_path) await supabase.storage.from("recursos").remove([oldPath]);
  revalidatePath("/hoja-en-blanco");
  return { ok: true };
}

export async function deleteResource(id: string): Promise<R> {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("library_resources").select("file_path").eq("id", id).maybeSingle();
  await supabase.from("library_resources").delete().eq("id", id);
  if (data?.file_path) await supabase.storage.from("recursos").remove([data.file_path]);
  revalidatePath("/hoja-en-blanco");
  return { ok: true };
}

// ───── Corrección de deberes ─────
export async function saveFeedback(f: FormData): Promise<R> {
  const { supabase, profile } = await requireStaff();
  const id = s(f, "id");
  const feedback = s(f, "feedback").slice(0, 10000);
  const { error } = await supabase.from("submissions").update({
    feedback: feedback || null,
    feedback_by: feedback ? profile.id : null,
    feedback_at: feedback ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) return { error: "No se ha podido guardar" };
  if (feedback) {
    // Aviso personal de Rosa al alumno (solo la primera vez que se corrige ese deber)
    const { data: sub } = await supabase.from("submissions").select("user_id,lesson_id,lesson:lessons(title)").eq("id", id).maybeSingle();
    const lessonTitle = (sub?.lesson as unknown as { title: string } | null)?.title;
    if (sub) await createAdminClient().from("notifications").insert({
      kind: "recordatorio", user_id: sub.user_id, ref: `rosa:deber:${id}`, link: `/formacion/leccion/${sub.lesson_id}#deber`,
      title: "Tienes la corrección de tu deber",
      body: lessonTitle ? `El equipo ha revisado lo que entregaste en «${lessonTitle}».` : "El equipo ha revisado tu entrega.",
    });
  }
  revalidatePath("/admin/deberes");
  return { ok: true, msg: feedback ? "Corrección enviada" : "Corrección quitada" };
}
