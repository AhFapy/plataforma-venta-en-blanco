"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

export async function rosaId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("value").eq("key", "rosa_profile_id").maybeSingle();
  return (data?.value as string) ?? null;
}

/** URL firmada para que el equipo suba una historia a la carpeta de Rosa. */
export async function rosaStoryUploadUrl(ext: string) {
  await requireStaff();
  const id = await rosaId();
  if (!id) return { error: "Falta configurar el perfil de Rosa" };
  const clean = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${id}/${Date.now()}.${clean}`;
  const { data, error } = await createAdminClient().storage.from("stories").createSignedUploadUrl(path);
  if (error || !data) return { error: "No se ha podido preparar la subida" };
  return { path, token: data.token };
}

export async function publishRosaStory(path: string, mediaType: "image" | "video", caption: string) {
  await requireStaff();
  const id = await rosaId();
  if (!id || !path.startsWith(`${id}/`) || path.includes("..")) return { error: "Archivo no válido" };
  if (mediaType !== "image" && mediaType !== "video") return { error: "Formato no válido" };
  const admin = createAdminClient();
  const url = admin.storage.from("stories").getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("stories").insert({ author_id: id, media_url: url, media_path: path, media_type: mediaType, caption: caption.trim().slice(0, 300) || null });
  if (error) return { error: "No se ha podido publicar" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Responder como Rosa. */
export async function sendAsRosa(to: string, body: string) {
  await requireStaff();
  const id = await rosaId();
  const text = body.trim();
  if (!id || !UUID.test(to) || to === id) return { error: "No válido" };
  if (!text || text.length > 4000) return { error: "Mensaje vacío o demasiado largo" };
  const admin = createAdminClient();
  const [a, b] = [id, to].sort();
  const { data: conv, error: e1 } = await admin.from("conversations").upsert({ user_a: a, user_b: b, last_message_at: new Date().toISOString() }, { onConflict: "user_a,user_b" }).select("id").single();
  if (e1 || !conv) return { error: "No se ha podido enviar" };
  const { error } = await admin.from("messages").insert({ conversation_id: conv.id, sender_id: id, body: text });
  if (error) return { error: "No se ha podido enviar" };
  revalidatePath("/admin/rosa", "layout");
  return { ok: true, conversation: conv.id as string };
}

export async function markReadAsRosa(conversationId: string) {
  await requireStaff();
  const id = await rosaId();
  if (!id || !UUID.test(conversationId)) return;
  await createAdminClient().from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", conversationId).neq("sender_id", id).is("read_at", null);
}
