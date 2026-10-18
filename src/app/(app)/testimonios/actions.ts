"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveMyTestimonial(f: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, profile } = await requireMember();
  const body = String(f.get("body") ?? "").trim().slice(0, 4000);
  const kind = f.get("kind") === "no_tangible" ? "no_tangible" : "tangible";
  const status = f.get("send") === "1" ? "enviado" : "borrador";
  if (!body) return { error: "Escribe tu testimonio" };
  const { data: mine } = await supabase.from("testimonials").select("id,status").eq("user_id", profile.id).maybeSingle();
  if (mine?.status === "publicado") return { error: "Tu testimonio ya está publicado" };
  const { error } = mine
    ? await supabase.from("testimonials").update({ body, kind, status }).eq("id", mine.id)
    : await supabase.from("testimonials").insert({ user_id: profile.id, body, kind, status });
  if (error) return { error: "No se ha podido guardar" };
  if (status === "enviado") {
    // Aviso a la CSM (Rosa le escribe); si falla no bloquea al alumno
    const admin = createAdminClient();
    const { data: csm } = await admin.from("profiles").select("id").eq("role", "csm").eq("active", true);
    const { data: rosa } = await admin.from("app_settings").select("value").eq("key", "rosa_profile_id").maybeSingle();
    const rosaId = (rosa?.value as string | undefined)?.replace(/"/g, "");
    if (rosaId) {
      for (const c of csm ?? []) {
        const [a, b] = [rosaId, c.id as string].sort();
        const { data: conv } = await admin.from("conversations").upsert({ user_a: a, user_b: b, last_message_at: new Date().toISOString() }, { onConflict: "user_a,user_b" }).select("id").single();
        if (conv) await admin.from("messages").insert({ conversation_id: conv.id, sender_id: rosaId, body: `📝 ${profile.full_name ?? "Un alumno"} ha enviado su testimonio. Revísalo en Seguimiento → Testimonios.` });
      }
    }
  }
  revalidatePath("/testimonios");
  return { ok: true };
}
