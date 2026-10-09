import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Mission = { id: string; category: "redes" | "apps" | "otros"; title: string; description: string | null; image_url: string | null; link: string | null; cta: string | null; points: number; position: number; active: boolean };

export async function getMissions(supabase: SupabaseClient, userId: string, categories: Mission["category"][]) {
  const [{ data: missions }, { data: done }] = await Promise.all([
    supabase.from("missions").select("*").eq("active", true).in("category", categories).order("position"),
    supabase.from("mission_completions").select("mission_id").eq("user_id", userId),
  ]);
  const doneIds = new Set((done ?? []).map((d) => d.mission_id));
  return ((missions ?? []) as Mission[]).map((m) => ({ ...m, done: doneIds.has(m.id) }));
}

export const LEVELS = [
  { min: 0, name: "Aprendiz", desc: "Acabas de entrar. Primeras clases y primera presentación." },
  { min: 100, name: "Setter", desc: "Ya llevas ritmo: clases hechas y participas en la comunidad." },
  { min: 300, name: "Closer", desc: "Aplicas el método y empiezas a tener resultados." },
  { min: 700, name: "High Ticket", desc: "Resultados constantes y referente para los demás." },
  { min: 1500, name: "Élite Trud", desc: "Lo más alto. Candidato prioritario en la bolsa de trabajo." },
];

export const POINT_KINDS: Record<string, string> = {
  resultado: "Resultados publicados",
  asistencia: "Asistencia a directos",
  leccion: "Clases completadas",
  mision: "Misiones",
  avance: "Avances diarios en tus objetivos",
  post: "Publicaciones",
  comentario: "Comentarios",
  manual: "Bonus del equipo",
};
