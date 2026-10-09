"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createStory(path: string, mediaType: "image" | "video", caption: string) {
  const { supabase, profile } = await requireMember();
  // El archivo tiene que estar en la carpeta del propio usuario
  if (!path.startsWith(`${profile.id}/`) || path.includes("..")) return { error: "Archivo no válido" };
  if (mediaType !== "image" && mediaType !== "video") return { error: "Formato no válido" };
  const { data } = supabase.storage.from("stories").getPublicUrl(path);
  const { error } = await supabase.from("stories").insert({
    author_id: profile.id,
    media_url: data.publicUrl,
    media_path: path,
    media_type: mediaType,
    caption: caption.trim().slice(0, 300) || null,
  });
  if (error) return { error: "No se ha podido publicar" };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteStory(id: string) {
  const { supabase, profile } = await requireMember();
  const { data: st } = await supabase.from("stories").select("media_path,author_id").eq("id", id).maybeSingle();
  if (!st) return { error: "No existe" };
  const { error, count } = await supabase.from("stories").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { error: "No puedes borrar esta historia" };
  if (st.author_id === profile.id) await supabase.storage.from("stories").remove([st.media_path]);
  else if (profile.role !== "alumno") await createAdminClient().storage.from("stories").remove([st.media_path]);
  revalidatePath("/");
  return { ok: true };
}
