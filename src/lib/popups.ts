import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Popup = { id: string; title: string; body: string | null; image_url: string | null; cta_label: string | null; link: string | null; starts_at: string; ends_at: string | null; active: boolean };

/** Primer pop-up activo y en fecha que este usuario aún no ha visto. */
export async function getActivePopup(supabase: SupabaseClient, userId: string): Promise<Popup | null> {
  const now = new Date().toISOString();
  const [{ data: popups }, { data: seen }] = await Promise.all([
    supabase.from("popups").select("*").eq("active", true).lte("starts_at", now).order("starts_at"),
    supabase.from("popup_views").select("popup_id").eq("user_id", userId),
  ]);
  const seenIds = new Set((seen ?? []).map((s) => s.popup_id));
  return ((popups ?? []) as Popup[]).find((p) => !seenIds.has(p.id) && (!p.ends_at || new Date(p.ends_at).getTime() > Date.now())) ?? null;
}
