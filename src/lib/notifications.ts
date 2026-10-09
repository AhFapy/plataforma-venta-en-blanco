import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Notification = {
  id: string;
  kind: "leccion" | "curso" | "directo" | "anuncio" | "aviso";
  title: string;
  body: string | null;
  link: string | null;
  count: number;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
};

export async function getNotifications(supabase: SupabaseClient, limit = 15) {
  const { data } = await supabase
    .from("notifications")
    .select("id,kind,title,body,link,count,created_at,author:profiles!notifications_created_by_fkey(full_name,avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Notification[];
}
