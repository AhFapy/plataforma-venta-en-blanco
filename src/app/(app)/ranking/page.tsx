import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { level } from "@/lib/data";

export const metadata = { title: "Ranking" };

type Row = { user_id: string; full_name: string | null; avatar_url: string | null; cohort: string | null; points_total: number; points_month: number };

export default async function Ranking({ searchParams }: { searchParams: Promise<{ v?: string; c?: string }> }) {
  const { v, c } = await searchParams;
  const view = v === "total" ? "total" : "mes";
  const { supabase, profile } = await requireMember();
  const col = view === "total" ? "points_total" : "points_month";
  let q = supabase.from("leaderboard").select("*").order(col, { ascending: false }).limit(100);
  if (c) q = q.eq("cohort", c);
  const [{ data }, { data: cohortsRaw }] = await Promise.all([
    q,
    supabase.from("profiles").select("cohort").not("cohort", "is", null),
  ]);
  const rows = (data ?? []) as Row[];
  const cohorts = [...new Set((cohortsRaw ?? []).map((r) => r.cohort as string))].sort().reverse();

  const tab = (label: string, href: string, on: boolean) => (
    <Link href={href} className={`rounded-full px-4 py-2 text-sm ${on ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted"}`}>{label}</Link>
  );
  const qs = (nv: string, nc?: string) => `/ranking?v=${nv}${nc ? `&c=${encodeURIComponent(nc)}` : ""}`;

  return (
    <div className="fade-in">
      <PageHeader label="Ranking" title="Los que" emphasis="ejecutan." />
      <div className="flex flex-wrap gap-2 mb-6">
        {tab("Este mes", qs("mes", c), view === "mes")}
        {tab("Histórico", qs("total", c), view === "total")}
        <span className="w-px bg-line mx-1" />
        {tab("Todas", qs(view), !c)}
        {cohorts.map((co) => tab(co, qs(view, co), c === co))}
      </div>

      <div className="card divide-y divide-line">
        {rows.map((r, i) => {
          const pts = view === "total" ? r.points_total : r.points_month;
          const me = r.user_id === profile.id;
          return (
            <Link key={r.user_id} href={`/miembros/${r.user_id}`} className={`flex items-center gap-4 px-5 py-3.5 ${me ? "bg-accent-soft" : "hover:bg-bg-badge/50"}`}>
              <span className={`w-8 font-semibold tabular-nums ${i < 3 ? "text-brand text-xl" : "text-ink-faint"}`}>{i + 1}</span>
              <Avatar name={r.full_name} url={r.avatar_url} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.full_name || "Miembro"}{me && " (tú)"}</p>
                <p className="text-xs text-ink-faint">{level(r.points_total).name}{r.cohort ? ` · ${r.cohort}` : ""}</p>
              </div>
              <span className="font-semibold tabular-nums">{pts}</span>
            </Link>
          );
        })}
        {rows.length === 0 && <p className="p-6 text-ink-muted">Sin datos todavía.</p>}
      </div>

      <section className="mt-8 card p-6">
        <p className="label mb-3">Cómo se puntúa</p>
        <p className="text-sm text-ink-muted leading-relaxed">
          Resultado publicado en Resultados <b className="text-ink">+50</b> · Asistencia a un directo <b className="text-ink">+15</b> · Lección completada <b className="text-ink">+10</b> · Publicación <b className="text-ink">+3</b> · Comentario <b className="text-ink">+1</b>
        </p>
      </section>
    </div>
  );
}
