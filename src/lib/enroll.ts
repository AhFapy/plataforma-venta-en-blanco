import "server-only";
import { createAdminClient } from "./supabase/admin";

export type EnrollInput = { email: string; full_name?: string; phone?: string; cohort?: string; enrolled_at?: string };

/** Da de alta (o reactiva) a un alumno. Idempotente por email. */
export async function enrollStudent(input: EnrollInput): Promise<{ id: string; created: boolean }> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Email no válido: ${input.email}`);

  const { data: existing } = await admin.from("profile_private").select("id").eq("email", email).maybeSingle();
  if (existing) {
    await admin.from("profiles").update({ active: true }).eq("id", existing.id);
    return { id: existing.id, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: input.full_name ?? "", phone: input.phone ?? null, cohort: input.cohort ?? null },
  });
  if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el usuario");

  if (input.enrolled_at) {
    await admin.from("profiles").update({ enrolled_at: new Date(input.enrolled_at).toISOString() }).eq("id", data.user.id);
  }
  return { id: data.user.id, created: true };
}
