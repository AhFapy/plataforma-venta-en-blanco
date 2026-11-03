import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Ordena la llamada" };

export default async function Page() {
  const { supabase, profile } = await requireMember();
  const [{ data: levels }, { data: progress }] = await Promise.all([
    supabase.from("game_order_levels").select("slug,title,intro,position").eq("active", true).order("position"),
    supabase.from("order_progress").select("slug,solved_ever,perfect_ever").eq("user_id", profile.id),
  ]);
  const p = new Map((progress ?? []).map((x) => [x.slug, x]));
  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/entrena" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Entrena</Link>
      <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">Ordena <span className="em">la llamada.</span></h1>
      <p className="text-ink-muted">A la primera son 30 XP. Cada semana puedes volver a ganarlos.</p>
      <ol className="space-y-2.5">
        {(levels ?? []).map((l, i) => {
          const st = p.get(l.slug);
          return (
            <li key={l.slug}>
              <Link href={`/entrena/ordena/${l.slug}`} className="feed-card p-4 flex items-center gap-4 hover:border-brand transition-colors">
                <span className={`grid place-items-center w-10 h-10 rounded-full shrink-0 font-semibold tabular-nums ${st?.solved_ever ? "bg-brand text-white" : "bg-bg-badge text-ink-muted"}`}>{st?.solved_ever ? <Check size={17} /> : i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold tracking-[-0.01em]">{l.title}</span>
                  <span className="block text-sm text-ink-muted truncate">{l.intro}</span>
                </span>
                {st?.perfect_ever && <span className="badge !bg-accent-soft !text-brand-deep shrink-0">A la primera</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
