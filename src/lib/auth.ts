import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Usuario + perfil actual. Redirige a login, a "sin acceso" o al onboarding según el caso. */
export const requireMember = cache(async (opts?: { allowNotOnboarded?: boolean }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: pub }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("profile_private").select("*").eq("id", user.id).maybeSingle(),
  ]);
  const profile = pub ? ({ ...(priv ?? { email: user.email ?? "", objectives: [], improvements: [] }), ...pub } as Profile) : null;
  if (!profile || !profile.active) redirect("/auth/sin-acceso");
  if (!profile.onboarded_at && !opts?.allowNotOnboarded) redirect("/bienvenida");

  return { supabase, user, profile };
});

export async function requireStaff() {
  const ctx = await requireMember();
  if (ctx.profile.role === "alumno") redirect("/");
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}
