import { requireCsm } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Resumen · Seguimiento" };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function Summary() {
  const { supabase } = await requireCsm();
  const { data } = await supabase.from("followups").select("start_date,objective_met,testimonial,onboarding_done,offboarding,status");
  const rows = data ?? [];
  // Agrupado por mes de entrada, como la hoja «Centro» del Excel
  const by = new Map<string, { n: number; obj: number; testi: number; onb: number; off: number; fin: number }>();
  for (const r of rows) {
    const k = String(r.start_date).slice(0, 7);
    const v = by.get(k) ?? { n: 0, obj: 0, testi: 0, onb: 0, off: 0, fin: 0 };
    v.n++; if (r.objective_met) v.obj++; if (r.testimonial === "hecho") v.testi++; if (r.onboarding_done) v.onb++; if (r.offboarding === "hecho") v.off++; if (r.status === "finalizado") v.fin++;
    by.set(k, v);
  }
  const keys = [...by.keys()].sort().reverse();
  const tot = [...by.values()].reduce((a, v) => ({ n: a.n + v.n, obj: a.obj + v.obj, testi: a.testi + v.testi, onb: a.onb + v.onb, off: a.off + v.off, fin: a.fin + v.fin }), { n: 0, obj: 0, testi: 0, onb: 0, off: 0, fin: 0 });
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const label = (k: string) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
  const cols = ["Mes de entrada", "Alumnos", "Onboarding Javi", "Objetivo cumplido", "Testimonio hecho", "Offboarding hecho", "Finalizados"];

  return (
    <div className="space-y-6">
      <PageHeader title="Resumen por" emphasis="mes." />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted border-b border-line">{cols.map((c) => <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {keys.map((k) => {
              const v = by.get(k)!;
              return (
                <tr key={k}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{label(k)}</td>
                  <td className="px-4 py-3 tabular-nums">{v.n}</td>
                  <td className="px-4 py-3 tabular-nums">{v.onb} <span className="text-ink-faint">({pct(v.onb, v.n)})</span></td>
                  <td className="px-4 py-3 tabular-nums">{v.obj} <span className="text-ink-faint">({pct(v.obj, v.n)})</span></td>
                  <td className="px-4 py-3 tabular-nums">{v.testi} <span className="text-ink-faint">({pct(v.testi, v.n)})</span></td>
                  <td className="px-4 py-3 tabular-nums">{v.off}</td>
                  <td className="px-4 py-3 tabular-nums">{v.fin}</td>
                </tr>
              );
            })}
            {keys.length === 0 && <tr><td colSpan={cols.length} className="px-4 py-6 text-ink-muted">Todavía no hay alumnos en seguimiento.</td></tr>}
          </tbody>
          {keys.length > 0 && (
            <tfoot>
              <tr className="border-t border-line font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 tabular-nums">{tot.n}</td>
                <td className="px-4 py-3 tabular-nums">{tot.onb} <span className="text-ink-faint font-normal">({pct(tot.onb, tot.n)})</span></td>
                <td className="px-4 py-3 tabular-nums">{tot.obj} <span className="text-ink-faint font-normal">({pct(tot.obj, tot.n)})</span></td>
                <td className="px-4 py-3 tabular-nums">{tot.testi} <span className="text-ink-faint font-normal">({pct(tot.testi, tot.n)})</span></td>
                <td className="px-4 py-3 tabular-nums">{tot.off}</td>
                <td className="px-4 py-3 tabular-nums">{tot.fin}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
