import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Liga semanal" };

type Row = { user_id: string; full_name: string | null; avatar_url: string | null; cohort: string | null; xp: number };

export default async function Liga() {
  const { supabase, profile } = await requireMember();
  const { data } = await supabase.from("league_week").select("*").order("xp", { ascending: false }).limit(100);
  const rows = (data ?? []) as Row[];
  const podium = rows.slice(0, 3);
  // Días que faltan hasta el lunes, hora de España
  const dow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })).getDay();
  const days = dow === 0 ? 1 : 8 - dow;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">La liga <span className="em">de la semana.</span></h1>
        <span className="badge">{days === 1 ? "Acaba mañana" : `Quedan ${days} días`}</span>
      </header>
      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 items-end">
          {[podium[1], podium[0], podium[2]].map((r, i) => r ? (
            <Link key={r.user_id} href={`/miembros/${r.user_id}`} className={`rounded-[20px] p-4 text-center space-y-2 ${i === 1 ? "bg-bg-dark on-dark text-[#f5f4ef] pb-8 pt-6" : "feed-card"}`}>
              <div className="flex justify-center"><Avatar name={r.full_name} url={r.avatar_url} size={i === 1 ? 60 : 46} /></div>
              <p className="font-semibold text-sm truncate">{(r.full_name || "Miembro").split(" ")[0]}</p>
              <p className={`text-xs tabular-nums ${i === 1 ? "text-accent font-semibold" : "text-ink-muted"}`}>{r.xp} XP</p>
            </Link>
          ) : <div key={i} />)}
        </div>
      )}
      <div className="card divide-y divide-line">
        {rows.map((r, i) => (
          <Link key={r.user_id} href={`/miembros/${r.user_id}`} className={`flex items-center gap-4 px-5 py-3.5 ${r.user_id === profile.id ? "bg-accent-soft" : "hover:bg-bg-badge/50"}`}>
            <span className={`w-8 font-semibold tabular-nums ${i < 3 ? "text-brand text-xl" : "text-ink-faint"}`}>{i + 1}</span>
            <Avatar name={r.full_name} url={r.avatar_url} size={36} />
            <span className="flex-1 min-w-0 font-medium truncate">{r.full_name || "Miembro"}{r.user_id === profile.id && " (tú)"}</span>
            <span className="font-semibold tabular-nums">{r.xp}</span>
          </Link>
        ))}
        {rows.length === 0 && <p className="p-6 text-ink-muted">Nadie ha jugado todavía esta semana.</p>}
      </div>
      <p className="text-sm text-ink-muted">El reto diario, los juegos, los quizzes y el simulador suman XP. Aquí no cuenta quién lleva más tiempo dentro, sino quién entrena esta semana. El top 3 se lleva insignia.</p>
    </div>
  );
}
