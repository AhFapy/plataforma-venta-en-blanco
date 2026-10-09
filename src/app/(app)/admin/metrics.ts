import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentRow } from "./students";

export type Metric = { label: string; value: number; of: number; hint: string };

/** Métricas de entrega del servicio: actividad real de los alumnos, no vanidad. */
export async function getServiceMetrics(supabase: SupabaseClient, students: StudentRow[], mentoriaPoints: number): Promise<Metric[]> {
  const ids = new Set(students.map((s) => s.id));
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const d7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: posts }, { data: comments }, { data: lv }, { data: ev }, { data: lp }, { data: wins }, { data: lastEvents }] = await Promise.all([
    supabase.from("posts").select("author_id").gte("created_at", d30).limit(5000),
    supabase.from("comments").select("author_id").gte("created_at", d30).limit(5000),
    supabase.from("lesson_views").select("user_id").gte("viewed_at", d30).limit(10000),
    supabase.from("event_views").select("user_id").gte("viewed_at", d30).limit(10000),
    supabase.from("lesson_progress").select("user_id").gte("completed_at", d7).limit(10000),
    supabase.from("posts").select("author_id, channel:channels!inner(is_wins)").eq("channel.is_wins", true).limit(5000),
    supabase.from("events").select("id").lt("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(4),
  ]);

  const count = (rows: { [k: string]: unknown }[] | null, key: string) =>
    new Set((rows ?? []).map((r) => r[key] as string).filter((id) => ids.has(id))).size;

  const wrote = new Set([...(posts ?? []).map((p) => p.author_id), ...(comments ?? []).map((c) => c.author_id)].filter((id) => ids.has(id))).size;
  const watched = new Set([...(lv ?? []).map((r) => r.user_id), ...(ev ?? []).map((r) => r.user_id)].filter((id) => ids.has(id))).size;

  let attendance = 0;
  const evIds = (lastEvents ?? []).map((e) => e.id);
  if (evIds.length) {
    const { data: att } = await supabase.from("event_attendance").select("event_id,user_id").in("event_id", evIds);
    const per = evIds.map((id) => (att ?? []).filter((a) => a.event_id === id && ids.has(a.user_id)).length);
    attendance = Math.round(per.reduce((a, b) => a + b, 0) / per.length);
  }

  const n = students.length;
  return [
    { label: "Han escrito en la comunidad", value: wrote, of: n, hint: "Publicación o comentario en los últimos 30 días" },
    { label: "Han visto una clase o grabación", value: watched, of: n, hint: "Últimos 30 días" },
    { label: "Completaron alguna clase", value: count(lp, "user_id"), of: n, hint: "Últimos 7 días" },
    { label: "Han publicado un resultado", value: count(wins as { [k: string]: unknown }[] | null, "author_id"), of: n, hint: "Desde que empezaron. Base de testimonios" },
    { label: "Asistencia media a directos", value: attendance, of: n, hint: `Últimas ${evIds.length || 0} sesiones (marcada por el equipo)` },
    { label: "Mentoría desbloqueada", value: students.filter((s) => s.points >= mentoriaPoints).length, of: n, hint: `${mentoriaPoints} puntos o más` },
    { label: "Sin entrar en 7 días", value: students.filter((s) => !s.last_seen_at || new Date(s.last_seen_at).getTime() < Date.now() - 7 * 86_400_000).length, of: n, hint: "Revisar en la lista de riesgo" },
    { label: "Alumnos activos", value: n, of: 0, hint: "Con acceso a la plataforma" },
  ];
}
