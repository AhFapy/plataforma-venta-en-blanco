"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { isStaffRole } from "@/lib/types";
import { REACTIONS } from "@/lib/reactions";

type Media = { url: string; type: string; name?: string | null };

export async function createPost(channelId: string, body: string, media: Media[] = []) {
  const { supabase, profile } = await requireMember();
  const text = body.trim();
  // Solo archivos subidos por esta persona a nuestro almacenamiento
  const prefix = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "")}/storage/v1/object/public/posts/${profile.id}/`;
  const files = (Array.isArray(media) ? media : []).slice(0, 6)
    .filter((m) => typeof m?.url === "string" && m.url.startsWith(prefix))
    .map((m) => ({ url: m.url, type: String(m.type || "").slice(0, 100), name: m.name ? String(m.name).slice(0, 200) : null }));
  if (!text && !files.length) return { error: "Escribe algo o adjunta un archivo" };
  if (text.length > 8000) return { error: "Demasiado largo" };
  const { error } = await supabase.from("posts").insert({ channel_id: channelId, author_id: profile.id, body: text, media: files });
  if (error) return { error: "No puedes publicar en este canal" };
  revalidatePath("/comunidad", "layout");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleLike(postId: string, like: boolean) {
  const { supabase, profile } = await requireMember();
  if (like) await supabase.from("post_likes").upsert({ post_id: postId, user_id: profile.id }, { ignoreDuplicates: true });
  else await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", profile.id);
  return { ok: true };
}

/** Quién ha dado like o ha reaccionado a un post, una fila por persona y lo más reciente primero. */
export async function getPostEngagement(postId: string) {
  const { supabase } = await requireMember();
  const [{ data: likes, error: e1 }, { data: reactions, error: e2 }, { data: post }] = await Promise.all([
    supabase.from("post_likes").select("user_id,created_at").eq("post_id", postId),
    supabase.from("post_reactions").select("user_id,emoji,created_at").eq("post_id", postId),
    supabase.from("posts").select("legacy_likes").eq("id", postId).maybeSingle(),
  ]);
  if (e1 || e2) return { error: "No se ha podido cargar la lista" };

  const byUser = new Map<string, { liked: boolean; emojis: string[]; at: string }>();
  const entry = (id: string, at: string) => {
    const cur = byUser.get(id) ?? { liked: false, emojis: [], at };
    if (at > cur.at) cur.at = at;
    byUser.set(id, cur);
    return cur;
  };
  for (const l of likes ?? []) entry(l.user_id, l.created_at).liked = true;
  for (const r of reactions ?? []) entry(r.user_id, r.created_at).emojis.push(r.emoji);

  const ids = [...byUser.keys()];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", ids)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((u) => [u.id as string, u]));
  const people = ids
    .map((id) => {
      const e = byUser.get(id)!;
      const u = profileById.get(id);
      return {
        id, name: (u?.full_name as string | null) ?? "Alumno", avatar: (u?.avatar_url as string | null) ?? null,
        liked: e.liked, emojis: REACTIONS.filter((x) => e.emojis.includes(x)) as string[], at: e.at,
      };
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  return { people, legacyLikes: (post?.legacy_likes as number | null) ?? 0 };
}

export async function toggleReaction(postId: string, emoji: string, on: boolean) {
  const { supabase, profile } = await requireMember();
  if (!(REACTIONS as readonly string[]).includes(emoji)) return { error: "Reacción no válida" };
  const q = on
    ? supabase.from("post_reactions").upsert({ post_id: postId, user_id: profile.id, emoji }, { ignoreDuplicates: true })
    : supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", profile.id).eq("emoji", emoji);
  const { error } = await q;
  if (error) return { error: "No se ha podido reaccionar" };
  return { ok: true };
}

export async function createComment(postId: string, body: string) {
  const { supabase, profile } = await requireMember();
  const text = body.trim();
  if (!text) return { error: "Escribe algo" };
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: profile.id, body: text.slice(0, 4000) });
  if (error) return { error: "No se ha podido comentar" };
  revalidatePath(`/comunidad/post/${postId}`);
  return { ok: true };
}

export async function deletePost(postId: string) {
  const { supabase } = await requireMember();
  await supabase.from("posts").delete().eq("id", postId);
  revalidatePath("/comunidad", "layout");
  return { ok: true };
}

export async function deleteComment(commentId: string, postId: string) {
  const { supabase } = await requireMember();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/comunidad/post/${postId}`);
  return { ok: true };
}

export async function togglePin(postId: string, pinned: boolean) {
  const { supabase, profile } = await requireMember();
  if (!isStaffRole(profile.role)) return { error: "Sin permiso" };
  await supabase.from("posts").update({ pinned }).eq("id", postId);
  revalidatePath("/comunidad", "layout");
  return { ok: true };
}

export async function markChannelRead(channelId: string) {
  const { supabase } = await requireMember();
  await supabase.rpc("mark_channel_read", { p_channel: channelId });
}
