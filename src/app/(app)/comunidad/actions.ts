"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { REACTIONS } from "@/lib/reactions";

export async function createPost(channelId: string, body: string) {
  const { supabase, profile } = await requireMember();
  const text = body.trim();
  if (!text) return { error: "Escribe algo" };
  if (text.length > 8000) return { error: "Demasiado largo" };
  const { error } = await supabase.from("posts").insert({ channel_id: channelId, author_id: profile.id, body: text });
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
  if (profile.role === "alumno") return { error: "Sin permiso" };
  await supabase.from("posts").update({ pinned }).eq("id", postId);
  revalidatePath("/comunidad", "layout");
  return { ok: true };
}
