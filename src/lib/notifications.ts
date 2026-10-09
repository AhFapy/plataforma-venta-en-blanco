import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Notification = {
  id: string;
  kind: "leccion" | "curso" | "directo" | "anuncio" | "aviso" | "recordatorio";
  title: string;
  body: string | null;
  link: string | null;
  count: number;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
};

export async function getNotifications(supabase: SupabaseClient, limit = 15, userId?: string) {
  const q = supabase
    .from("notifications")
    .select("id,kind,title,body,link,count,created_at,author:profiles!notifications_created_by_fkey(full_name,avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);
  // Generales + las personales de este usuario (el equipo puede leer las de todos, pero no las queremos en su campana)
  const scoped = userId ? q.or(`user_id.is.null,user_id.eq.${userId}`) : q.is("user_id", null);
  const { data } = await scoped;
  return (data ?? []) as unknown as Notification[];
}
