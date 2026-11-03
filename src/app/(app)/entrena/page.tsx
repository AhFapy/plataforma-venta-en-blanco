import Link from "next/link";
import { ArrowRight, Check, Eye, Flame, ListOrdered, MessageCircleQuestion, PhoneCall, Trophy } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

type LeagueRow = { user_id: string; full_name: string | null; avatar_url: string | null; xp: number };

export default async function EntrenaHub() {
  const { supabase, profile } = await requireMember();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const [{ data: streak }, { data: run }, { data: board }, { data: sessions }, { data: orderDone }, { count: orderTotal }, { data: simDone }, { count: simTotal }] = await Promise.all([
    supabase.from("game_streaks").select("current,best,last_day").eq("user_id", profile.id).maybeSingle(),
    supabase.from("daily_runs").select("finished,hits").eq("user_id", profile.id).eq("day", today).maybeSingle(),
    supabase.from("league_week").select("user_id,full_name,avatar_url,xp").order("xp", { ascending: false }).limit(100),
    supabase.from("game_sessions").select("game,score").eq("user_id", profile.id).not("finished_at", "is", null).order("score", { ascending: false }).limit(200),
    supabase.from("order_progress").select("slug").eq("user_id", profile.id).eq("solved_ever", true),
    supabase.from("game_order_levels").select("slug", { count: "exact", head: true }).eq("active", true),
    supabase.from("sim_runs").select("scenario,result").eq("user_id", profile.id).in("result", ["cierre", "integridad", "agenda"]),
    supabase.from("game_scenarios").select("slug", { count: "exact", head: true }).eq("active", true),
  ]);

  const rows = (board ?? []) as LeagueRow[];
  const myIdx = rows.findIndex((r) => r.user_id === profile.id);
  const myWeek = myIdx >= 0 ? rows[myIdx].xp : null;
  const best = (g: string) => (sessions ?? []).find((s) => s.game === g)?.score ?? null;
  const simWins = new Set((simDone ?? []).map((s) => s.scenario)).size;
  // La racha guardada caduca sola: si ayer no se hizo el reto, ya no cuenta
  const yesterday = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date(Date.now() - 86_400_000));
  const cur = streak?.last_day === today || streak?.last_day === yesterday ? (streak?.current ?? 0) : 0;
  const dayLabel = run?.finished ? "Hecho hoy" : cur > 0 && streak?.last_day !== today ? "Hoy te toca mantenerla" : "Empieza hoy";

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] bg-bg-dark on-dark text-[#f5f4ef] p-6 sm:p-8 overflow-hidden relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-[#a4a8a4]">Reto de hoy · 3 preguntas</p>
            <h1 className="text-[34px] sm:text-[44px] leading-[1.02] font-semibold tracking-[-0.035em]">
              {run?.finished ? <>Hoy ya <span className="em">has cumplido.</span></> : <>Un minuto, <span className="em">cada día.</span></>}
            </h1>
            {run?.finished ? (
              <p className="text-[#a4a8a4] flex items-center gap-2"><Check size={16} className="text-accent" /> {run.hits} de 3 aciertos. Mañana, otro.</p>
            ) : (
              <Link href="/entrena/reto" className="btn bg-accent text-on-accent font-semibold">Hacer el reto <ArrowRight size={15} /></Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`grid place-items-center w-16 h-16 rounded-full ${cur > 0 ? "bg-accent text-on-accent" : "bg-white/10 text-[#a4a8a4]"}`}><Flame size={30} strokeWidth={1.8} /></span>
            <div>
              <p className="text-[40px] leading-none font-semibold tabular-nums tracking-[-0.03em]">{cur}</p>
              <p className="text-sm text-[#a4a8a4]">{cur === 1 ? "día" : "días"} de racha · {dayLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <GameCard href="/entrena/ping-pong" icon={<MessageCircleQuestion size={22} strokeWidth={1.8} />} title="Ping Pong de Objeciones" desc="Te sueltan una objeción y tienes 12 segundos. Sin frases de memoria." meta={best("ping_pong") !== null ? `Tu récord: ${best("ping_pong")}` : "3 vidas · 12 objeciones"} />
        <GameCard href="/entrena/simulador" icon={<PhoneCall size={22} strokeWidth={1.8} />} title="Simulador de llamada" desc="Cinco leads, cinco llamadas. Cada decisión cambia cómo acaba." meta={`${simWins} de ${simTotal ?? 0} superadas`} />
        <GameCard href="/entrena/lee" icon={<Eye size={22} strokeWidth={1.8} />} title="Lee al lead" desc="Perfil, canal, cerebro y objeción real. Detecta lo que no te dicen." meta={best("lee") !== null ? `Tu récord: ${best("lee")}` : "3 vidas · 9 segundos"} />
        <GameCard href="/entrena/ordena" icon={<ListOrdered size={22} strokeWidth={1.8} />} title="Ordena la llamada" desc="Cada fase en su sitio, de la conexión al cierre." meta={`${orderDone?.length ?? 0} de ${orderTotal ?? 0} niveles`} />
      </div>

      <section className="feed-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="label flex items-center gap-2"><Trophy size={15} className="text-brand" /> Liga de esta semana</p>
          <Link href="/entrena/liga" className="text-sm text-ink-muted hover:text-ink">Ver todo</Link>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Nadie ha jugado todavía esta semana. Es tu oportunidad.</p>
        ) : (
          <ol className="divide-y divide-line">
            {rows.slice(0, 5).map((r, i) => (
              <li key={r.user_id} className={`flex items-center gap-3 py-2.5 ${r.user_id === profile.id ? "font-semibold" : ""}`}>
                <span className={`w-6 tabular-nums ${i < 3 ? "text-brand font-semibold" : "text-ink-faint"}`}>{i + 1}</span>
                <Avatar name={r.full_name} url={r.avatar_url} size={30} />
                <span className="flex-1 min-w-0 truncate text-[15px]">{r.full_name || "Miembro"}</span>
                <span className="tabular-nums text-sm">{r.xp} XP</span>
              </li>
            ))}
          </ol>
        )}
        {myIdx >= 5 && <p className="mt-3 text-sm text-ink-muted">Vas el {myIdx + 1}.º con {myWeek} XP.</p>}
        <p className="mt-3 text-xs text-ink-faint">Se reinicia cada lunes. El XP de la liga no cuenta para tu rango ni para la mentoría.</p>
      </section>
    </div>
  );
}

function GameCard({ href, icon, title, desc, meta }: { href: string; icon: React.ReactNode; title: string; desc: string; meta: string }) {
  return (
    <Link href={href} className="feed-card p-5 flex flex-col gap-3 hover:border-brand transition-colors">
      <span className="grid place-items-center w-11 h-11 rounded-full bg-brand-soft text-brand-deep">{icon}</span>
      <div className="space-y-1 flex-1">
        <h2 className="font-semibold text-[17px] tracking-[-0.015em]">{title}</h2>
        <p className="text-sm text-ink-muted">{desc}</p>
      </div>
      <p className="text-xs text-ink-faint flex items-center justify-between">{meta} <ArrowRight size={14} className="text-brand" /></p>
    </Link>
  );
}
