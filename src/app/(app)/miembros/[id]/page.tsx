import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { getMyPoints, level } from "@/lib/data";
import { fmtDate, timeAgo } from "@/lib/utils";

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile: me } = await requireMember();
  const { data: m } = await supabase.from("profiles").select("id,full_name,avatar_url,role,cohort,bio,enrolled_at").eq("id", id).maybeSingle();
  if (!m) notFound();
  const [pts, { data: posts }, { count: lessons }, { data: priv }] = await Promise.all([
    getMyPoints(supabase, m.id),
    supabase.from("posts").select("id,body,created_at,channel:channels(name)").eq("author_id", m.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("user_id", m.id),
    // Solo el equipo puede leerlo (RLS): para alumnos vuelve vacío
    supabase.from("profile_private").select("phone").eq("id", m.id).maybeSingle(),
  ]);
  const lvl = level(pts.total);
  const staffViewer = me.role !== "alumno";

  return (
    <div className="fade-in max-w-3xl space-y-6">
      <Link href="/miembros" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Miembros</Link>
      <section className="card p-7 flex flex-col sm:flex-row gap-6 sm:items-center">
        <Avatar name={m.full_name} url={m.avatar_url} size={88} />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{m.full_name}</h1>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-dot">{lvl.name}</span>
            {m.cohort && <span className="badge">{m.cohort}</span>}
            {m.role !== "alumno" && <span className="badge !bg-brand !text-white">Equipo Trud</span>}
          </div>
          {m.bio && <p className="text-ink-muted max-w-xl">{m.bio}</p>}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Puntos", pts.total],
          ["Lecciones", lessons ?? 0],
          ["Desde", fmtDate(m.enrolled_at)],
        ].map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="label mb-1">{k}</p>
            <p className="text-xl font-semibold tracking-[-0.02em]">{v}</p>
          </div>
        ))}
      </div>

      {staffViewer && priv?.phone && (
        <a href={`https://wa.me/${priv.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn btn-brand"><MessageCircle size={16} /> WhatsApp</a>
      )}

      <section className="space-y-3">
        <p className="label">Últimas publicaciones</p>
        {(posts ?? []).map((p) => (
          <Link key={p.id} href={`/comunidad/post/${p.id}`} className="card p-5 block hover:border-brand">
            <p className="text-xs text-ink-faint mb-1">{(p.channel as unknown as { name: string } | null)?.name} · {timeAgo(p.created_at)}</p>
            <p className="line-clamp-3 text-[15px]">{p.body}</p>
          </Link>
        ))}
        {(posts ?? []).length === 0 && <p className="text-ink-muted">Todavía no ha publicado.</p>}
      </section>
    </div>
  );
}
