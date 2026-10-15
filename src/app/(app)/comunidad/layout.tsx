import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import type { Channel } from "@/lib/types";
import { ChannelTabs } from "./ChannelTabs";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireMember();
  const [{ data }, { data: unread }] = await Promise.all([
    supabase.from("channels").select("*").order("position"),
    supabase.rpc("unread_posts_by_channel"),
  ]);
  const counts = new Map(((unread ?? []) as { channel_id: string; n: number }[]).map((r) => [r.channel_id, Number(r.n)]));
  const channels = (data ?? []) as Channel[];
  return (
    <div className="fade-in">
      <PageHeader label="Comunidad" title="Aquí no se vende" emphasis="solo." />
      <ChannelTabs channels={channels.map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji, unread: counts.get(c.id) ?? 0 }))} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
