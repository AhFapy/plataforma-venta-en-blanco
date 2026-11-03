import { requireStaff } from "@/lib/auth";
import { SEED_COUNTS } from "@/lib/entrena/seed";
import { EntrenaAdmin } from "./EntrenaAdmin";

export const metadata = { title: "Entrena" };

export default async function AdminEntrena() {
  const { supabase, profile } = await requireStaff();
  const [{ data: setting }, { count: quiz }, { count: items }, { count: levels }, { count: scenarios }, { data: xp }, { count: badges }, { data: runs }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "entrena_abierto").maybeSingle(),
    supabase.from("quiz_questions").select("id", { count: "exact", head: true }),
    supabase.from("game_items").select("id", { count: "exact", head: true }),
    supabase.from("game_order_levels").select("slug", { count: "exact", head: true }),
    supabase.from("game_scenarios").select("slug", { count: "exact", head: true }),
    supabase.from("game_xp").select("user_id").limit(5000),
    supabase.from("user_badges").select("slug", { count: "exact", head: true }),
    supabase.from("daily_runs").select("user_id").eq("finished", true).limit(5000),
  ]);
  const open = setting?.value === "1";
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Entrena</h1>
      <EntrenaAdmin open={open} admin={profile.role === "admin"} />
      <section className="card p-6 space-y-3">
        <p className="font-semibold">Contenido cargado</p>
        <ul className="text-[15px] divide-y divide-line">
          {[
            ["Preguntas de quiz", quiz ?? 0, SEED_COUNTS.quiz],
            ["Objeciones y situaciones", items ?? 0, SEED_COUNTS.pingPong + SEED_COUNTS.lee],
            ["Niveles de Ordena", levels ?? 0, SEED_COUNTS.order],
            ["Llamadas del simulador", scenarios ?? 0, SEED_COUNTS.scenarios],
          ].map(([k, n, t]) => (
            <li key={k as string} className="flex justify-between py-2.5"><span>{k}</span><b className="tabular-nums">{n} / {t}</b></li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted">Las preguntas de los quizzes se editan desde Contenido, en cada módulo. Los módulos de Análisis de Llamadas y Bonus no tienen quiz porque no hay material escrito del que sacarlo.</p>
      </section>
      <section className="card p-6 space-y-3">
        <p className="font-semibold">Uso</p>
        <ul className="text-[15px] divide-y divide-line">
          {[
            ["Alumnos que han jugado", new Set((xp ?? []).map((x) => x.user_id)).size],
            ["Retos diarios completados", runs?.length ?? 0],
            ["Insignias concedidas", badges ?? 0],
          ].map(([k, n]) => (
            <li key={k as string} className="flex justify-between py-2.5"><span>{k}</span><b className="tabular-nums">{n}</b></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
