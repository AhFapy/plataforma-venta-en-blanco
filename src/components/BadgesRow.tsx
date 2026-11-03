import { createClient } from "@/lib/supabase/server";
import { BadgeCoin } from "@/app/(app)/entrena/ui";

/** Insignias ganadas, para perfiles. Si no tiene ninguna no ocupa sitio. */
export async function BadgesRow({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_badges")
    .select("earned_at,badge:game_badges(slug,name,icon)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });
  const rows = (data ?? []) as unknown as { badge: { slug: string; name: string; icon: string } | null }[];
  const list = rows.filter((r) => r.badge);
  if (!list.length) return null;
  return (
    <section className="space-y-3">
      <p className="label">Insignias</p>
      <ul className="flex flex-wrap gap-3">
        {list.map(({ badge }) => (
          <li key={badge!.slug} className="flex items-center gap-2.5 rounded-full bg-surface border border-line pl-1.5 pr-4 py-1.5">
            <BadgeCoin icon={badge!.icon} size={32} />
            <span className="text-sm font-medium">{badge!.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
