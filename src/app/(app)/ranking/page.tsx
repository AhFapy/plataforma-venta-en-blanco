import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { ProgressBar } from "@/components/Progress";
import { MissionCard } from "@/components/MissionCard";
import { getMyPoints, level } from "@/lib/data";
import { getMissions, LEVELS, POINT_KINDS } from "@/lib/missions";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Ranking" };

type Row = { user_id: string; full_name: string | null; avatar_url: string | null; cohort: string | null; points_total: number; points_month: number };

const RULES = [
  ["Publicar un resultado en Resultados", "+50"],
  ["Completar una misión (redes, apps…)", "+10 a +30"],
  ["Asistir a un directo", "+15"],
  ["Completar una clase", "+10"],
  ["Publicar en la comunidad", "+3"],
  ["Avanzar en tus objetivos (una vez al día)", "+2"],
  ["Comentar", "+1"],
];

export default async function Ranking({ searchParams }: { searchParams: Promise<{ t?: string; v?: string; c?: string }> }) {
  const { t, v, c } = await searchParams;
  const tabSel = t === "puntos" || v === "puntos" ? "puntos" : t === "gana" ? "gana" : "ranking";
  const { supabase, profile } = await requireMember();

  const Tabs = (
    <div className="flex flex-wrap gap-2 mb-6">
      {[["ranking", "Ranking"], ["puntos", "Mis puntos y rangos"], ["gana", "Gana puntos"]].map(([id, label]) => (
        <Link key={id} href={`/ranking?t=${id}`} className={`rounded-full px-4 py-2 text-sm ${tabSel === id ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted hover:text-ink"}`}>{label}</Link>
      ))}
    </div>
  );

  if (tabSel === "puntos") {
    const [pts, { data: events }, settings] = await Promise.all([
      getMyPoints(supabase, profile.id),
      supabase.from("point_events").select("kind,points").eq("user_id", profile.id).limit(5000),
      getSettings(supabase),
    ]);
    const byKind = new Map<string, number>();
    for (const e of events ?? []) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.points);
    const lvl = level(pts.total);
    const mentoriaPct = Math.min(1, pts.total / settings.mentoria_points);

    return (
      <div className="fade-in max-w-3xl">
        <PageHeader title="Tus" emphasis="puntos." />
        {Tabs}
        <section className="feed-card p-6 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-ink-muted">Tu rango</p>
              <p className="text-3xl font-semibold tracking-[-0.03em]">{lvl.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums">{pts.total}</p>
              <p className="text-sm text-ink-muted">puntos · {pts.month} este mes</p>
            </div>
          </div>
          <ProgressBar value={lvl.pct} />
          <p className="text-sm text-ink-faint">{lvl.next ? `Te faltan ${lvl.toNext} puntos para ${lvl.next}` : "Has llegado al rango máximo"}</p>
        </section>

        <section className="mt-4 rounded-[20px] bg-bg-dark on-dark text-[#f5f4ef] p-6 space-y-3">
          <p className="text-sm text-[#a4a8a4]">Recompensa</p>
          <p className="text-xl font-semibold tracking-[-0.02em]">Mentoría 1 a 1 con Javi al llegar a {settings.mentoria_points} puntos</p>
          <ProgressBar value={mentoriaPct} dark />
          {mentoriaPct >= 1 ? (
            settings.mentoria_url
              ? <a href={settings.mentoria_url} target="_blank" rel="noreferrer" className="btn bg-accent text-on-accent">Reservar mi mentoría</a>
              : <p className="text-[#a4a8a4] text-sm">Desbloqueada. El equipo te escribirá para agendarla.</p>
          ) : (
            <p className="text-sm text-[#a4a8a4]">Llevas {pts.total} de {settings.mentoria_points}. Lo que más suma: publicar tus resultados.</p>
          )}
        </section>

        <section className="mt-4 feed-card p-6">
          <p className="label mb-4">De dónde vienen tus puntos</p>
          {byKind.size === 0 ? (
            <p className="text-ink-muted text-sm">Aún no tienes puntos. Empieza por tu primera clase o una misión.</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                <li key={k} className="flex items-center justify-between py-2.5 text-[15px]">
                  <span>{POINT_KINDS[k] ?? k}</span>
                  <span className={`font-semibold tabular-nums ${n < 0 ? "text-red-700" : ""}`}>{n > 0 ? `+${n}` : n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 feed-card p-6">
          <p className="label mb-4">Rangos</p>
          <ol className="space-y-3">
            {LEVELS.map((l, i) => {
              const reached = pts.total >= l.min;
              const current = lvl.name === l.name;
              return (
                <li key={l.name} className={`flex items-start gap-3 rounded-[14px] p-3 ${current ? "bg-accent-soft" : ""}`}>
                  <span className={`grid place-items-center w-8 h-8 rounded-full shrink-0 ${reached ? "bg-brand text-white" : "bg-bg-badge text-ink-faint"}`}>
                    {reached ? <Check size={15} /> : <Lock size={13} />}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{i + 1}. {l.name} <span className="text-ink-faint font-normal text-sm">· desde {l.min} pts</span></p>
                    <p className="text-sm text-ink-muted">{l.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-4 feed-card p-6">
          <p className="label mb-4">Cómo se puntúa</p>
          <ul className="divide-y divide-line">
            {RULES.map(([k, n]) => (
              <li key={k} className="flex items-center justify-between py-2.5 text-[15px]"><span>{k}</span><b className="tabular-nums">{n}</b></li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  if (tabSel === "gana") {
    const missions = await getMissions(supabase, profile.id, ["redes", "otros", "apps"]);
    const redes = missions.filter((m) => m.category !== "apps");
    const apps = missions.filter((m) => m.category === "apps");
    return (
      <div className="fade-in max-w-4xl">
        <PageHeader title="Gana" emphasis="puntos." />
        {Tabs}
        <p className="text-ink-muted mb-5">Acciones rápidas que suman puntos para tu rango y para la mentoría con Javi.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {redes.map((m) => <MissionCard key={m.id} m={m} />)}
        </div>
        {apps.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 font-semibold text-lg tracking-[-0.02em]">Aplicaciones y recursos</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {apps.map((m) => <MissionCard key={m.id} m={m} />)}
            </div>
          </>
        )}
        {missions.length === 0 && <p className="text-ink-muted">No hay misiones activas ahora mismo.</p>}
      </div>
    );
  }

  const view = v === "total" ? "total" : "mes";
  const col = view === "total" ? "points_total" : "points_month";
  let q = supabase.from("leaderboard").select("*").order(col, { ascending: false }).limit(100);
  if (c) q = q.eq("cohort", c);
  const [{ data }, { data: cohortsRaw }] = await Promise.all([
    q,
    supabase.from("profiles").select("cohort").not("cohort", "is", null),
  ]);
  const rows = (data ?? []) as Row[];
  const cohorts = [...new Set((cohortsRaw ?? []).map((r) => r.cohort as string))].sort().reverse();

  const chip = (label: string, href: string, on: boolean) => (
    <Link key={href} href={href} className={`rounded-full px-3.5 py-1.5 text-sm border ${on ? "border-ink text-ink" : "border-line text-ink-muted hover:text-ink"}`}>{label}</Link>
  );
  const qs = (nv: string, nc?: string) => `/ranking?v=${nv}${nc ? `&c=${encodeURIComponent(nc)}` : ""}`;

  return (
    <div className="fade-in max-w-4xl">
      <PageHeader title="Los que" emphasis="ejecutan." />
      {Tabs}
      <div className="flex flex-wrap gap-2 mb-5">
        {chip("Este mes", qs("mes", c), view === "mes")}
        {chip("Histórico", qs("total", c), view === "total")}
        <span className="w-px bg-line mx-1" />
        {chip("Todas las promociones", qs(view), !c)}
        {cohorts.map((co) => chip(co, qs(view, co), c === co))}
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
    </div>
  );
}
