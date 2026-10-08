import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import type { Channel } from "@/lib/types";
import { Composer } from "../components";
import { PostCard, POST_SELECT, type PostRow } from "../posts";

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

  return (
    <div className="max-w-3xl space-y-4">
      {channel.description && <p className="text-ink-muted">{channel.description}</p>}
      {canPost && (
        <Composer
          channelId={channel.id}
          wins={channel.is_wins}
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
