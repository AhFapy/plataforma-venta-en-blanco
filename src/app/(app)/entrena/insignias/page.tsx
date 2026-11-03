import { requireMember } from "@/lib/auth";
import { fmtDate } from "@/lib/utils";
import { BadgeCoin } from "../ui";

export const metadata = { title: "Insignias" };

export default async function Insignias() {
  const { supabase, profile } = await requireMember();
  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase.from("game_badges").select("*").order("position"),
    supabase.from("user_badges").select("slug,earned_at").eq("user_id", profile.id),
  ]);
  const earned = new Map((mine ?? []).map((b) => [b.slug, b.earned_at as string]));
  return (
    <div className="space-y-5">
      <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">Tus <span className="em">insignias.</span></h1>
      <p className="text-ink-muted">{earned.size} de {all?.length ?? 0}. Se ven en tu perfil, y cada una da puntos de rango una sola vez.</p>
      <ul className="grid sm:grid-cols-2 gap-3">
        {(all ?? []).map((b) => {
          const at = earned.get(b.slug);
          return (
            <li key={b.slug} className={`feed-card p-4 flex items-center gap-4 ${at ? "" : "opacity-70"}`}>
              <BadgeCoin icon={b.icon} earned={!!at} />
              <div className="min-w-0">
                <p className="font-semibold tracking-[-0.01em]">{b.name}</p>
                <p className="text-sm text-ink-muted">{b.description}</p>
                <p className="text-xs text-ink-faint mt-1">{at ? `Conseguida el ${fmtDate(at)}` : b.points > 0 ? `+${b.points} pts` : ""}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
