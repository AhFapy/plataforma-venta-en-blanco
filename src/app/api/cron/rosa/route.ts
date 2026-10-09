import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rosa: recordatorios diarios (Vercel Cron, 1 vez al día a las 9:00 de España).
 * - Directos de hoy → aviso para todos.
 * - Alumnos que llevan 4+ días sin entrar → recordatorio personal (máx. 1 por semana).
 * Es idempotente: si se ejecuta dos veces el mismo día no duplica nada.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Cerrado si no hay CRON_SECRET: Vercel solo manda la cabecera cuando la variable existe
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const tz = "Europe/Madrid";
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date());
  const hhmm = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  let created = 0;

  // 1) Directos de hoy
  const from = new Date(Date.now() - 2 * 3600_000).toISOString();
  const to = new Date(Date.now() + 26 * 3600_000).toISOString();
  const { data: events } = await db.from("events").select("id,title,starts_at").gte("starts_at", from).lte("starts_at", to);
  for (const e of events ?? []) {
    if (new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date(e.starts_at)) !== today) continue;
    const ref = `rosa:directo:${e.id}`;
    const { count } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("ref", ref);
    if (count) continue;
    await db.from("notifications").insert({
      kind: "recordatorio", ref, link: "/eventos",
      title: `Hoy a las ${hhmm(e.starts_at)} tenemos directo`,
      body: `${e.title}. Te esperamos dentro, trae tus dudas.`,
    });
    created++;
  }

  // 2) Alumnos que se están descolgando
  // Semana ISO (máximo un recordatorio de inactividad por persona y semana)
  const d = new Date(`${today}T12:00:00Z`);
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = `${d.getUTCFullYear()}-w${1 + Math.round(((d.getTime() - firstThu.getTime()) / 86_400_000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7)}`;
  const cutoff = new Date(Date.now() - 4 * 86_400_000).toISOString();
  const { data: idle } = await db
    .from("profiles")
    .select("id,full_name,last_seen_at")
    .eq("active", true)
    .eq("role", "alumno")
    .not("onboarded_at", "is", null)
    .lt("last_seen_at", cutoff)
    .limit(500);
  for (const p of idle ?? []) {
    const days = Math.floor((Date.now() - new Date(p.last_seen_at!).getTime()) / 86_400_000);
    if (days > 45) continue; // ya no es un recordatorio, es un caso para el equipo
    const name = (p.full_name || "").split(" ")[0];
    const { error } = await db.from("notifications").insert({
      kind: "recordatorio", user_id: p.id, ref: `rosa:inactivo:${week}`, link: "/",
      title: `¿Seguimos${name ? `, ${name}` : ""}?`,
      body: `Llevas ${days} días sin pasarte. Tu siguiente clase te está esperando: con 20 minutos hoy ya avanzas.`,
    });
    if (!error) created++;
  }

  // 3) Limpieza de historias caducadas (filas y archivos)
  const { data: expired } = await db.from("stories").select("id,media_path").lt("expires_at", new Date().toISOString()).limit(1000);
  if (expired?.length) {
    await db.storage.from("stories").remove(expired.map((e) => e.media_path));
    await db.from("stories").delete().in("id", expired.map((e) => e.id));
  }

  return NextResponse.json({ ok: true, created, cleaned: expired?.length ?? 0 });
}
