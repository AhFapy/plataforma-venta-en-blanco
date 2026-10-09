import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Settings = {
  rosa_name: string;
  rosa_avatar_url: string | null;
  trustpilot_url: string | null;
  mentoria_points: number;
  mentoria_url: string | null;
};

export const getSettings = cache(async (supabase: SupabaseClient): Promise<Settings> => {
  const { data } = await supabase.from("app_settings").select("key,value");
  const m = new Map((data ?? []).map((r) => [r.key as string, r.value as string | null]));
  return {
    rosa_name: m.get("rosa_name") || "Rosa",
    rosa_avatar_url: m.get("rosa_avatar_url") || null,
    trustpilot_url: m.get("trustpilot_url") || null,
    mentoria_points: Number(m.get("mentoria_points")) || 500,
    mentoria_url: m.get("mentoria_url") || null,
  };
});
