import Link from "next/link";
import { ArrowRight, Check, Flame } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Llamada a la acción del reto diario en Inicio: lo primero que ve el alumno si aún no lo ha hecho. */
export async function EntrenaCard({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const { data: open } = await supabase.rpc("entrena_open");
  if (!open) return null;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const [{ data: st }, { data: run }] = await Promise.all([
    supabase.from("game_streaks").select("current,last_day").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_runs").select("finished").eq("user_id", userId).eq("day", today).maybeSingle(),
  ]);
  const cur = st?.current ?? 0;
  const yesterday = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date(Date.now() - 86_400_000));
  const alive = st?.last_day === today || st?.last_day === yesterday;
  const streak = alive ? cur : 0;
  if (run?.finished) {
    return (
      <Link href="/entrena" className="feed-card p-4 flex items-center gap-3 hover:border-brand transition-colors">
        <span className="grid place-items-center w-10 h-10 rounded-full bg-accent text-on-accent shrink-0"><Flame size={19} /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold flex items-center gap-1.5"><Check size={15} className="text-brand" /> Reto de hoy hecho</span>
          <span className="block text-sm text-ink-muted">{streak} {streak === 1 ? "día" : "días"} de racha · Sigue en Entrena</span>
        </span>
        <ArrowRight size={16} className="text-brand shrink-0" />
      </Link>
    );
  }
  return (
    <Link href="/entrena/reto" className="block rounded-[20px] bg-bg-dark on-dark text-[#f5f4ef] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#a4a8a4]">Reto de hoy · 1 minuto</p>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums"><Flame size={15} className={streak > 0 ? "text-accent" : "text-[#a4a8a4]"} /> {streak}</span>
      </div>
      <p className="text-[21px] leading-tight font-semibold tracking-[-0.025em]">{streak > 0 ? <>No rompas tu racha de {streak} {streak === 1 ? "día." : "días."}</> : <>3 preguntas. <span className="em">Empieza tu racha.</span></>}</p>
      <span className="btn bg-accent text-on-accent font-semibold !py-2">Hacer el reto <ArrowRight size={15} /></span>
    </Link>
  );
}
