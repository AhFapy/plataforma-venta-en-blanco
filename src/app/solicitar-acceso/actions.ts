"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type R = { ok?: boolean; already?: boolean; error?: string };

export async function requestAccess(f: FormData): Promise<R> {
  const full_name = String(f.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(f.get("phone") ?? "").trim().slice(0, 40);
  if (String(f.get("website") ?? "")) return { ok: true }; // trampa para bots
  if (full_name.length < 3) return { error: "Escribe tu nombre y apellidos." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisa el email." };
  if (phone.replace(/\D/g, "").length < 6) return { error: "Escribe tu teléfono (WhatsApp)." };

  const admin = createAdminClient();

  // ¿Ya tiene acceso?
  const { data: pp } = await admin.from("profile_private").select("id").eq("email", email).maybeSingle();
  if (pp) {
    const { data: p } = await admin.from("profiles").select("active").eq("id", pp.id).maybeSingle();
    if (p?.active) return { already: true };
  }

  // ¿Ya hay una pendiente? Se actualizan los datos y listo.
  const { data: pending } = await admin.from("access_requests").select("id").ilike("email", email).eq("status", "pendiente").maybeSingle();
  if (pending) {
    await admin.from("access_requests").update({ full_name, phone }).eq("id", pending.id);
    return { ok: true };
  }

  const { error } = await admin.from("access_requests").insert({ email, full_name, phone });
  if (error) return { error: "No hemos podido enviar la solicitud. Prueba en un minuto." };

  // Aviso al equipo desde el perfil de Rosa (con freno por si alguien abusa del formulario)
  const { count } = await admin.from("access_requests").select("id", { count: "exact", head: true })
    .eq("status", "pendiente").gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) <= 15) {
    await admin.rpc("rosa_report_dm", {
      p_body: `🔔 Nueva solicitud de acceso\n${full_name} · ${email} · ${phone}\n\nAcéptala en Admin → Solicitudes.`,
    });
  }
  return { ok: true };
}
