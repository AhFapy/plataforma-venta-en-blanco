"use server";

import { requireMember } from "@/lib/auth";

export async function markPopupSeen(popupId: string, clicked: boolean) {
  const { supabase, profile } = await requireMember();
  await supabase.from("popup_views").upsert({ popup_id: popupId, user_id: profile.id, clicked }, { onConflict: "popup_id,user_id" });
}
