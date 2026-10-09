"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";

type R = { ok?: boolean; error?: string };

// ───── Deberes ─────
/** Guarda (o actualiza) el deber del alumno en una clase. El archivo ya está subido desde el navegador. */
export async function saveSubmission(
  lessonId: string,
  body: string,
  file: { path: string; name: string } | null,
  removeFile: boolean,
): Promise<R> {
  const { supabase, profile } = await requireMember();
  const text = body.trim().slice(0, 20000);
  if (file && (!file.path.startsWith(`${profile.id}/${lessonId}/`) || file.path.includes(".."))) return { error: "Archivo no válido" };

  const { data: prev } = await supabase.from("submissions").select("id,file_path").eq("user_id", profile.id).eq("lesson_id", lessonId).maybeSingle();
  const nextPath = file ? file.path : removeFile ? null : prev?.file_path ?? null;
  if (!text && !nextPath) return { error: "Escribe algo o adjunta un archivo" };

  const row = {
    user_id: profile.id,
    lesson_id: lessonId,
    body: text || null,
    file_path: nextPath,
    file_name: file ? file.name.slice(0, 200) : nextPath ? undefined : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = prev
    ? await supabase.from("submissions").update(row).eq("id", prev.id)
    : await supabase.from("submissions").insert(row);
  if (error) return { error: "No se ha podido entregar" };
  // Archivo anterior sustituido o quitado: se borra
  if (prev?.file_path && prev.file_path !== nextPath) await supabase.storage.from("deberes").remove([prev.file_path]);
  revalidatePath(`/formacion/leccion/${lessonId}`);
  revalidatePath("/hoja-en-blanco");
  return { ok: true };
}

// ───── Notas ─────
export async function createFolder(name: string): Promise<R & { id?: string }> {
  const { supabase, profile } = await requireMember();
  const n = name.trim().slice(0, 60);
  if (!n) return { error: "Ponle nombre" };
  const { data, error } = await supabase.from("note_folders").insert({ user_id: profile.id, name: n }).select("id").single();
  if (error) return { error: "No se ha podido crear" };
  return { ok: true, id: data.id };
}

export async function renameFolder(id: string, name: string): Promise<R> {
  const { supabase } = await requireMember();
  const n = name.trim().slice(0, 60);
  if (!n) return { error: "Ponle nombre" };
  const { error } = await supabase.from("note_folders").update({ name: n }).eq("id", id);
  return error ? { error: "No se ha podido renombrar" } : { ok: true };
}

/** Borra la carpeta; sus notas pasan a "Sin carpeta". */
export async function deleteFolder(id: string): Promise<R> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("note_folders").delete().eq("id", id);
  return error ? { error: "No se ha podido borrar" } : { ok: true };
}

export async function createNote(folderId: string | null): Promise<R & { id?: string; created_at?: string }> {
  const { supabase, profile } = await requireMember();
  const { data, error } = await supabase.from("notes").insert({ user_id: profile.id, folder_id: folderId }).select("id,created_at").single();
  if (error) return { error: "No se ha podido crear" };
  return { ok: true, id: data.id, created_at: data.created_at };
}

export async function saveNote(id: string, patch: { title?: string; body?: string; folder_id?: string | null }): Promise<R & { updated_at?: string }> {
  const { supabase } = await requireMember();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title.slice(0, 140);
  if (patch.body !== undefined) row.body = patch.body.slice(0, 100000);
  if (patch.folder_id !== undefined) row.folder_id = patch.folder_id;
  const { error } = await supabase.from("notes").update(row).eq("id", id);
  if (error) return { error: "No se ha podido guardar" };
  return { ok: true, updated_at: row.updated_at as string };
}

export async function deleteNote(id: string): Promise<R> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  return error ? { error: "No se ha podido borrar" } : { ok: true };
}
