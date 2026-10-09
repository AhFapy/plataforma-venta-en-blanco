import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import type { Channel } from "@/lib/types";
import { Composer } from "../components";
import { PostCard, POST_SELECT, type PostRow } from "../posts";
import { getSettings } from "@/lib/settings";
import { getMyPoints } from "@/lib/data";
import { ProgressBar } from "@/components/Progress";

export default async function ChannelPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ n?: string }> }) {
  const { slug } = await params;
  const { n } = await searchParams;
  const limit = Math.min(Number(n) || 30, 300);
  const { supabase, profile } = await requireMember();
  const { data: channel } = await supabase.from("channels").select("*").eq("slug", slug).maybeSingle<Channel>();
  if (!channel) notFound();

  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("channel_id", channel.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  const rows = (data ?? []) as unknown as PostRow[];
  const more = rows.length > limit;
  const posts = rows.slice(0, limit);
  const staff = profile.role !== "alumno";
  const canPost = staff || !channel.staff_only_post;
  const [settings, pts] = channel.is_wins ? await Promise.all([getSettings(supabase), getMyPoints(supabase, profile.id)]) : [null, null];

  return (
    <div className="max-w-3xl space-y-4">
      {channel.description && <p className="text-ink-muted">{channel.description}</p>}
      {channel.is_wins && settings && pts && (
        <Link href="/ranking?t=puntos" className="on-dark block rounded-[20px] bg-bg-dark p-5 text-[#f5f4ef] space-y-3 hover:opacity-95">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-lg tracking-[-0.02em]">Cada resultado suma 50 puntos</p>
            <p className="text-sm text-[#a4a8a4]">{Math.min(pts.total, settings.mentoria_points)} / {settings.mentoria_points}</p>
          </div>
          <p className="text-sm text-[#a4a8a4]">Al llegar a {settings.mentoria_points} puntos desbloqueas una mentoría 1 a 1 con Javi.</p>
          <ProgressBar value={pts.total / settings.mentoria_points} dark />
        </Link>
      )}
      {canPost && (
        <Composer
          channelId={channel.id}
          wins={channel.is_wins}
          trustpilotUrl={channel.is_wins ? settings?.trustpilot_url ?? null : null}
          placeholder={channel.is_wins ? "¿Qué has conseguido? Cliente, cierre, ingresos… con números." : channel.slug === "presentate" ? "Quién eres, de dónde vienes y qué quieres conseguir" : "Escribe algo para la comunidad"}
        />
      )}
      {posts.length === 0 && <p className="text-ink-muted py-10 text-center">Nadie ha escrito aún. Rompe el hielo.</p>}
      {posts.map((p) => <PostCard key={p.id} p={p} me={profile.id} staff={staff} />)}
      {more && (
        <div className="text-center pt-2">
          <Link href={`/comunidad/${slug}?n=${limit + 30}`} scroll={false} className="btn btn-ghost">Ver más</Link>
        </div>
      )}
    </div>
  );
}
