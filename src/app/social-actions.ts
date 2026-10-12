"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";

const UUID = /^[0-9a-f-]{36}$/i;

export async function markStoryViewed(storyId: string) {
  if (!UUID.test(storyId)) return;
  const { supabase, profile } = await requireMember();
  await supabase.from("story_views").upsert({ story_id: storyId, user_id: profile.id }, { onConflict: "story_id,user_id", ignoreDuplicates: true });
}

export async function toggleStoryLike(storyId: string, on: boolean) {
  if (!UUID.test(storyId)) return { error: "No válido" };
  const { supabase, profile } = await requireMember();
  const { error } = on
    ? await supabase.from("story_likes").upsert({ story_id: storyId, user_id: profile.id }, { onConflict: "story_id,user_id", ignoreDuplicates: true })
    : await supabase.from("story_likes").delete().eq("story_id", storyId).eq("user_id", profile.id);
  return error ? { error: "No se ha podido guardar" } : { ok: true };
}

export type StoryViewer = { id: string; name: string; avatar: string | null; liked: boolean; at: string };

/** Quién ha visto y quién ha dado corazón a una historia (solo su autor, por RLS). */
export async function getStoryActivity(storyId: string): Promise<StoryViewer[]> {
  if (!UUID.test(storyId)) return [];
  const { supabase } = await requireMember();
  const [{ data: views }, { data: likes }] = await Promise.all([
    supabase.from("story_views").select("user_id,viewed_at,user:profiles!story_views_user_id_fkey(id,full_name,avatar_url)").eq("story_id", storyId).order("viewed_at", { ascending: false }),
    supabase.from("story_likes").select("user_id").eq("story_id", storyId),
  ]);
  const liked = new Set((likes ?? []).map((l) => l.user_id as string));
  type V = { user_id: string; viewed_at: string; user: { id: string; full_name: string | null; avatar_url: string | null } | null };
  return ((views ?? []) as unknown as V[])
    .filter((v) => v.user)
    .map((v) => ({ id: v.user_id, name: v.user!.full_name || "Miembro", avatar: v.user!.avatar_url, liked: liked.has(v.user_id), at: v.viewed_at }))
    .sort((a, b) => Number(b.liked) - Number(a.liked));
}

export async function sendDm(to: string, body: string, storyId?: string | null) {
  if (!UUID.test(to) || (storyId && !UUID.test(storyId))) return { error: "No válido" };
  const text = body.trim();
  if (!text) return { error: "Escribe algo" };
  if (text.length > 4000) return { error: "Demasiado largo" };
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("send_dm", { p_to: to, p_body: text, p_story: storyId ?? null });
  if (error) return { error: "No se ha podido enviar" };
  revalidatePath("/mensajes", "layout");
  return { ok: true, conversation: data as string };
}

export async function markConversationRead(conversationId: string) {
  if (!UUID.test(conversationId)) return;
  const { supabase } = await requireMember();
  await supabase.rpc("mark_conversation_read", { p_conv: conversationId });
}
