// Protocolo de seguimiento de la CSM: días 1-2, semana 2 y meses 1 a 6.
export const STAGES = [
  { key: "dias_1_2", label: "Días 1-2", day: 1 },
  { key: "semana_2", label: "Semana 2", day: 7 },
  { key: "mes_1", label: "Mes 1", day: 30 },
  { key: "mes_2", label: "Mes 2", day: 60 },
  { key: "mes_3", label: "Mes 3", day: 90 },
  { key: "mes_4", label: "Mes 4", day: 120 },
  { key: "mes_5", label: "Mes 5", day: 150 },
  { key: "mes_6", label: "Mes 6", day: 180 },
] as const;
export const STAGE_LABEL: Record<string, string> = { ...Object.fromEntries(STAGES.map((s) => [s.key, s.label])), extra: "Extra" };

export type Overview = {
  user_id: string; full_name: string | null; avatar_url: string | null; email: string | null; phone: string | null;
  start_date: string; month: number; status: "activo" | "finalizado";
  progress_pct: number; sessions: number; applications: number; active_projects: number; interviews: number; revenue: number;
  last_seen_at: string | null; inactive_days: number;
  at_risk_auto: boolean; at_risk_manual: boolean | null; at_risk: boolean; risk_reason: string | null;
  guarantee: boolean; testimonial: string; offboarding: string;
  last_checkin: string | null; done_stages: string[];
};

const DAY = 86_400_000;
const d0 = (s: string) => new Date(s + "T00:00:00Z");
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Lunes y domingo de la semana actual (UTC). */
export function thisWeek(now = new Date()) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mon = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAY);
  return { mon, sun: new Date(mon.getTime() + 6 * DAY), today: t };
}

/** Check-ins del protocolo pendientes: los de esta semana y los atrasados. */
export function dueCheckins(o: Pick<Overview, "start_date" | "done_stages" | "status">, now = new Date()) {
  if (o.status !== "activo") return [];
  const { mon, sun } = thisWeek(now);
  const start = d0(o.start_date).getTime();
  return STAGES.filter((s) => !o.done_stages.includes(s.key))
    .map((s) => ({ ...s, due: new Date(start + s.day * DAY) }))
    .filter((s) => s.due <= sun)
    .map((s) => ({ ...s, overdue: s.due < mon }));
}

export const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n) || 0);
export const fmtDay = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
