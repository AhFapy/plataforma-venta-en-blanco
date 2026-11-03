import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Simulador de llamada" };

const LEVEL = ["", "Fácil", "Media", "Difícil"];

export default async function Page() {
  const { supabase, profile } = await requireMember();
  const [{ data: scenarios }, { data: wins }] = await Promise.all([
    supabase.from("game_scenarios").select("slug,title,persona,role,difficulty,position").eq("active", true).order("position"),
    supabase.from("sim_runs").select("scenario").eq("user_id", profile.id).in("result", ["cierre", "integridad", "agenda"]),
  ]);
  const won = new Set((wins ?? []).map((w) => w.scenario));
  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/entrena" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Entrena</Link>
      <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">Simulador <span className="em">de llamada.</span></h1>
      <p className="text-ink-muted">No es una llamada real, pero te prepara para ella. Las marcas de las ofertas son inventadas. Lo que aprendes, no.</p>
      <ul className="space-y-2.5">
        {(scenarios ?? []).map((s) => (
          <li key={s.slug}>
            <Link href={`/entrena/simulador/${s.slug}`} className="feed-card p-5 flex items-center gap-4 hover:border-brand transition-colors">
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block font-semibold text-[17px] tracking-[-0.015em]">{s.title}</span>
                <span className="block text-sm text-ink-muted">{s.persona}</span>
                <span className="flex flex-wrap gap-1.5 pt-1">
                  <span className="badge">{s.role}</span>
                  <span className="badge">{LEVEL[s.difficulty] ?? ""}</span>
                  {won.has(s.slug) && <span className="badge !bg-accent-soft !text-brand-deep"><Check size={12} /> Superada</span>}
                </span>
              </span>
              <ArrowRight size={18} className="text-brand shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
