"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { enrollStudent } from "@/lib/enroll";

type R = { ok?: boolean; already?: boolean; pending?: boolean; error?: string };

export async function requestAccess(f: FormData): Promise<R> {
  const full_name = String(f.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(f.get("phone") ?? "").trim().slice(0, 40);
  if (String(f.get("website") ?? "")) return { ok: true }; // trampa para bots
  if (full_name.length < 3) return { error: "Escribe tu nombre y apellidos." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisa el email." };
  if (phone.replace(/\D/g, "").length < 6) return { error: "Escribe tu teléfono (WhatsApp)." };

  const admin = createAdminClient();
  const { count: recent } = await admin.from("access_requests").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  const notify = (recent ?? 0) <= 15; // freno por si alguien abusa del formulario

  // ¿Ya existe?
  const { data: pp } = await admin.from("profile_private").select("id").eq("email", email).maybeSingle();
  if (pp) {
    const { data: p } = await admin.from("profiles").select("active").eq("id", pp.id).maybeSingle();
    if (p?.active) return { already: true };
    // Desactivado a propósito: no se reactiva solo, queda pendiente para el equipo
    const { data: pend } = await admin.from("access_requests").select("id").ilike("email", email).eq("status", "pendiente").maybeSingle();
    if (!pend) {
      await admin.from("access_requests").insert({ email, full_name, phone });
      if (notify) await admin.rpc("rosa_report_dm", {
        p_body: `🔔 ${full_name} (${email}) pide volver a entrar, pero su acceso estaba desactivado.\nAcéptalo o recházalo en Admin → Solicitudes.`,
      });
    }
    return { pending: true };
  }

  // Alta directa
  let profileId: string;
  try {
    const r = await enrollStudent({ email, full_name, phone, cohort: new Date().toISOString().slice(0, 7) });
    profileId = r.id;
  } catch {
    return { error: "No hemos podido darte de alta. Prueba en un minuto." };
  }
  await admin.from("access_requests").insert({ email, full_name, phone, status: "aceptada", decided_at: new Date().toISOString(), profile_id: profileId });

  if (notify) await admin.rpc("rosa_report_dm", {
    p_body: `🆕 Nuevo alumno dado de alta desde la bienvenida\n${full_name} · ${email} · ${phone}\n\nSi no es alumno, desactívalo en Admin → Alumnos.`,
  });
  return { ok: true };
}
