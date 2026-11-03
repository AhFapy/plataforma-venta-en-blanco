"use server";

import { grantAccess, type AccessResult } from "@/lib/access";

export async function requestAccess(f: FormData): Promise<AccessResult> {
  const full_name = String(f.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(f.get("phone") ?? "").trim().slice(0, 40);
  if (String(f.get("website") ?? "")) return { ok: true }; // trampa para bots
  if (full_name.length < 3) return { error: "Escribe tu nombre y apellidos." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisa el email." };
  if (phone.replace(/\D/g, "").length < 6) return { error: "Escribe tu teléfono (WhatsApp)." };

  return grantAccess({ full_name, email, phone });
}
