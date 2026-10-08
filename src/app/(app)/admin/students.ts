import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentRow = {
  id: string; full_name: string | null; email: string; phone: string | null; role: string; active: boolean; cohort: string | null;
  enrolled_at: string; last_seen_at: string | null; onboarded_at: string | null;
  done: number; total: number; points: number; risk: string | null;
};

export async function getStudents(supabase: SupabaseClient): Promise<StudentRow[]> {
  const [{ data: profiles }, { data: priv }, { data: progress }, { count: total }, { data: board }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,role,active,cohort,enrolled_at,last_seen_at,onboarded_at").order("enrolled_at", { ascending: false }),
    supabase.from("profile_private").select("id,email,phone"),
    supabase.from("progress_counts").select("user_id,done"),
    supabase.from("lessons").select("id, modules!inner(courses!inner(published))", { count: "exact", head: true }).eq("published", true).eq("modules.courses.published", true),
    supabase.from("leaderboard").select("user_id,points_total"),
  ]);
  const privMap = new Map((priv ?? []).map((p) => [p.id, p]));
  const doneMap = new Map<string, number>();
  for (const p of progress ?? []) doneMap.set(p.user_id, p.done as number);
  const ptsMap = new Map((board ?? []).map((b) => [b.user_id, b.points_total as number]));
  const now = Date.now();
  const days = (iso: string | null) => (iso ? (now - new Date(iso).getTime()) / 86_400_000 : Infinity);

  return (profiles ?? []).map((p) => {
    let risk: string | null = null;
    if (p.active && p.role === "alumno") {
      if (!p.last_seen_at && days(p.enrolled_at) > 2) risk = "Nunca ha entrado";
      else if (!p.onboarded_at && days(p.enrolled_at) > 3) risk = "Sin completar perfil";
      else if (days(p.last_seen_at) > 7) risk = `${Math.floor(days(p.last_seen_at))} días sin entrar`;
      else if ((doneMap.get(p.id) ?? 0) === 0 && days(p.enrolled_at) > 7) risk = "Sin empezar la formación";
    }
    const pr = privMap.get(p.id);
    return {
      ...p,
      email: pr?.email ?? "",
      phone: pr?.phone ?? null,
      done: doneMap.get(p.id) ?? 0,
      total: total ?? 0,
      points: ptsMap.get(p.id) ?? 0,
      risk,
    } as StudentRow;
  });
}
