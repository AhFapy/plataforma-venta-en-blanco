import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import { PostCard, POST_SELECT, type PostRow } from "../../posts";
import { CommentForm, DeleteComment } from "../../components";

type CommentRow = { id: string; body: string; created_at: string; author_id: string; author: { id: string; full_name: string | null; avatar_url: string | null } | null };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireMember();
  const [{ data: post }, { data: comments }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT + ",channel:channels(slug,name)").eq("id", id).maybeSingle(),
    supabase.from("comments").select("id,body,created_at,author_id,author:profiles!comments_author_id_fkey(id,full_name,avatar_url)").eq("post_id", id).order("created_at"),
  ]);
  if (!post) notFound();
  const p = post as unknown as PostRow & { channel: { slug: string; name: string } };
  const staff = profile.role !== "alumno";

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/comunidad/${p.channel.slug}`} className="text-sm text-ink-muted hover:text-ink">← {p.channel.name}</Link>
      <PostCard p={p} me={profile.id} staff={staff} full />
      <section className="space-y-4 pl-2 sm:pl-6">
        {((comments ?? []) as unknown as CommentRow[]).map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar name={c.author?.full_name} url={c.author?.avatar_url} size={32} />
            <div className="flex-1 min-w-0 rounded-[14px] bg-bg-alt border border-line px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{c.author?.full_name} <span className="text-ink-faint font-normal">· {timeAgo(c.created_at)}</span></p>
                {(staff || c.author_id === profile.id) && <DeleteComment id={c.id} postId={p.id} />}
              </div>
              <p className="text-[15px] whitespace-pre-line break-words mt-1">{c.body}</p>
            </div>
          </div>
        ))}
        <CommentForm postId={p.id} />
      </section>
    </div>
  );
}
