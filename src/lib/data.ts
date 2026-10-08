import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, Lesson, Module, Profile } from "./types";
import { moduleStates, type ModuleState } from "./utils";

export async function getCurriculum(supabase: SupabaseClient, profile: Profile) {
  const [{ data: courses }, { data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("courses").select("*").order("position"),
    supabase.from("modules").select("*").order("position"),
    supabase.from("lessons").select("id,module_id,title,description,duration_min,position,published,updated_at").order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", profile.id),
  ]);
  const staff = profile.role !== "alumno";
  const visibleCourses = (courses ?? []).filter((c: Course) => c.published || staff) as Course[];
  const courseIds = new Set(visibleCourses.map((c) => c.id));
  const mods = ((modules ?? []) as Module[]).filter((m) => courseIds.has(m.course_id));
  const less = ((lessons ?? []) as Lesson[]).filter((l) => l.published || staff);
  const completed = new Set((progress ?? []).map((p: { lesson_id: string }) => p.lesson_id));

  // Estados de desbloqueo por curso (la progresión es dentro de cada curso)
  const states = new Map<string, ModuleState>();
  for (const c of visibleCourses) {
    const cm = mods.filter((m) => m.course_id === c.id);
    moduleStates(cm, less, completed, profile.enrolled_at, staff).forEach((v, k) => states.set(k, v));
  }

  const ordered: (Lesson & { course: Course; module: Module })[] = [];
  for (const c of visibleCourses)
    for (const m of mods.filter((x) => x.course_id === c.id))
      for (const l of less.filter((x) => x.module_id === m.id)) ordered.push({ ...l, course: c, module: m });

  const unlockedLessons = ordered.filter((l) => states.get(l.module_id)?.unlocked);
  const next = unlockedLessons.find((l) => !completed.has(l.id)) ?? null;

  return { courses: visibleCourses, modules: mods, lessons: less, ordered, completed, states, next };
}

export async function getMyPoints(supabase: SupabaseClient, userId: string) {
  const { data: board } = await supabase.from("leaderboard").select("user_id,points_total,points_month").order("points_month", { ascending: false });
  const rows = (board ?? []) as { user_id: string; points_total: number; points_month: number }[];
  const idx = rows.findIndex((r) => r.user_id === userId);
  return { total: rows[idx]?.points_total ?? 0, month: rows[idx]?.points_month ?? 0, rank: idx >= 0 ? idx + 1 : null, of: rows.length };
}

export function level(points: number) {
  const levels = [
    { min: 0, name: "Aprendiz" },
    { min: 100, name: "Setter" },
    { min: 300, name: "Closer" },
    { min: 700, name: "High Ticket" },
    { min: 1500, name: "Élite Trud" },
  ];
  let i = 0;
  while (i + 1 < levels.length && points >= levels[i + 1].min) i++;
  const cur = levels[i], nxt = levels[i + 1];
  return { name: cur.name, n: i + 1, next: nxt?.name ?? null, toNext: nxt ? nxt.min - points : 0, pct: nxt ? (points - cur.min) / (nxt.min - cur.min) : 1 };
}
