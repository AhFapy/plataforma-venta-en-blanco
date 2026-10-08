"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { enrollStudent } from "@/lib/enroll";
import { createAdminClient } from "@/lib/supabase/admin";

type R = { ok?: boolean; error?: string; msg?: string };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => { const v = Number(f.get(k)); return Number.isFinite(v) ? v : 0; };
const orNull = (v: string) => v || null;

// ───── Alumnos ─────
export async function inviteStudents(f: FormData): Promise<R> {
  await requireAdmin();
  const cohort = s(f, "cohort") || new Date().toISOString().slice(0, 7);
  // Una línea por alumno: email, nombre, teléfono (nombre y teléfono opcionales)
  const lines = s(f, "lines").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { error: "Pega al menos un email" };
  let created = 0, reactivated = 0;
  const errors: string[] = [];
  for (const line of lines) {
    const [email, full_name, phone] = line.split(/[,;\t]/).map((x) => x?.trim());
    try {
      const r = await enrollStudent({ email, full_name, phone, cohort });
      if (r.created) created++; else reactivated++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : email);
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: errors.length === 0, msg: `${created} dados de alta, ${reactivated} ya existían${errors.length ? ` · Errores: ${errors.join(" | ")}` : ""}` };
}

export async function updateMember(id: string, patch: { active?: boolean; role?: "alumno" | "mentor" | "admin"; cohort?: string | null }): Promise<R> {
  const { profile } = await requireAdmin();
  if (id === profile.id && (patch.active === false || (patch.role && patch.role !== "admin"))) return { error: "No puedes quitarte tu propio acceso" };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function awardPoints(userId: string, points: number, note: string): Promise<R> {
  const { supabase } = await requireStaff();
  if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 500) return { error: "Puntos entre -500 y 500" };
  const { error } = await supabase.from("point_events").insert({ user_id: userId, kind: "manual", points, ref: crypto.randomUUID(), note: note.slice(0, 200) });
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ───── Contenido ─────
export async function saveCourse(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  const row = { title: s(f, "title"), description: orNull(s(f, "description")), cover_url: orNull(s(f, "cover_url")), position: n(f, "position"), published: f.get("published") === "on" };
  if (!row.title) return { error: "Falta el título" };
  const { error } = id ? await supabase.from("courses").update(row).eq("id", id) : await supabase.from("courses").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveModule(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  const mode = s(f, "unlock_mode");
  const row = {
    course_id: s(f, "course_id"),
    title: s(f, "title"),
    description: orNull(s(f, "description")),
    position: n(f, "position"),
    unlock_mode: (["libre", "progreso", "fecha"].includes(mode) ? mode : "libre") as "libre" | "progreso" | "fecha",
    unlock_after_days: Math.max(0, Math.floor(n(f, "unlock_after_days"))),
  };
  if (!row.title) return { error: "Falta el título" };
  const { error } = id ? await supabase.from("modules").update(row).eq("id", id) : await supabase.from("modules").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveLesson(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  // Recursos: una línea por recurso → "Texto | https://url"
  const resources = s(f, "resources").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter(([a, b]) => a && b).map(([label, url]) => ({ label, url }));
  const dur = n(f, "duration_min");
  const row = {
    module_id: s(f, "module_id"),
    title: s(f, "title"),
    description: orNull(s(f, "description")),
    duration_min: dur > 0 ? Math.round(dur) : null,
    position: n(f, "position"),
    published: f.get("published") === "on",
    ...(f.get("bump") === "on" ? { updated_at: new Date().toISOString() } : {}),
  };
  if (!row.title) return { error: "Falta el título" };
  const { data: saved, error } = id
    ? await supabase.from("lessons").update(row).eq("id", id).select("id").single()
    : await supabase.from("lessons").insert(row).select("id").single();
  if (error || !saved) return { error: error?.message ?? "No se pudo guardar" };
  const { error: mErr } = await supabase.from("lesson_media").upsert({ lesson_id: saved.id, video_url: orNull(s(f, "video_url")), resources });
  if (mErr) return { error: mErr.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteRow(table: "courses" | "modules" | "lessons" | "events", id: string): Promise<R> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ───── Eventos ─────
export async function saveEvent(f: FormData): Promise<R> {
  const { supabase } = await requireStaff();
  const id = s(f, "id");
  // datetime-local llega sin zona: se interpreta como hora de España
  const toIso = (v: string) => (v ? madridToUtc(v) : null);
  const row = {
    title: s(f, "title"),
    description: orNull(s(f, "description")),
    starts_at: toIso(s(f, "starts_at")),
    ends_at: toIso(s(f, "ends_at")),
    meeting_url: orNull(s(f, "meeting_url")),
    recording_url: orNull(s(f, "recording_url")),
  };
  if (!row.title || !row.starts_at) return { error: "Falta título o fecha" };
  const { error } = id ? await supabase.from("events").update(row).eq("id", id) : await supabase.from("events").insert(row);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAttendance(eventId: string, userIds: string[]): Promise<R> {
  const { supabase } = await requireStaff();
  const { data: cur } = await supabase.from("event_attendance").select("user_id").eq("event_id", eventId);
  const have = new Set((cur ?? []).map((r) => r.user_id));
  const want = new Set(userIds);
  const add = userIds.filter((u) => !have.has(u)).map((user_id) => ({ event_id: eventId, user_id }));
  const del = [...have].filter((u) => !want.has(u));
  if (add.length) await supabase.from("event_attendance").insert(add);
  if (del.length) await supabase.from("event_attendance").delete().eq("event_id", eventId).in("user_id", del);
  revalidatePath("/admin/eventos");
  return { ok: true, msg: `${want.size} asistentes guardados` };
}

/** "2026-10-12T19:00" en hora de Madrid → ISO UTC */
function madridToUtc(local: string) {
  const asUtc = new Date(local + ":00Z");
  const madrid = new Date(asUtc.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() - (madrid.getTime() - utc.getTime())).toISOString();
}
