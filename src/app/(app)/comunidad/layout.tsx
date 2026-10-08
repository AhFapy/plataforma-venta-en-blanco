import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import type { Channel } from "@/lib/types";
import { ChannelTabs } from "./ChannelTabs";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("channels").select("*").order("position");
  const channels = (data ?? []) as Channel[];
  return (
    <div className="fade-in">
      <PageHeader label="Comunidad" title="Aquí no se vende" emphasis="solo." />
      <ChannelTabs channels={channels.map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji }))} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
