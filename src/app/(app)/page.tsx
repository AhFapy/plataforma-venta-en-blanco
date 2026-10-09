import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Heart, MessageCircle, Play, Trophy, Video } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum, getMyPoints, level } from "@/lib/data";
import { getNotifications, type Notification } from "@/lib/notifications";
import { firstName, fmtDateTime, timeAgo } from "@/lib/utils";
import { ProgressBar } from "@/components/Progress";
import { Avatar } from "@/components/Avatar";
import { NotificationIcon } from "@/components/NotificationIcon";

type FeedPost = {
  id: string; body: string; created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null; role: string } | null;
  channel: { name: string; slug: string; is_wins: boolean } | null;
  post_likes: { user_id: string }[];
  comments: { count: number }[];
};

type FeedItem = { at: string } & ({ type: "note"; n: Notification } | { type: "post"; p: FeedPost });

export default async function Home() {
  const { supabase, profile } = await requireMember();
  const [cur, pts, notes, { data: postsRaw }, { data: nextEvent }, { data: top }] = await Promise.all([
    getCurriculum(supabase, profile),
    getMyPoints(supabase, profile.id),
    getNotifications(supabase, 20),
    supabase
      .from("posts")
      .select("id,body,created_at,author:profiles!posts_author_id_fkey(id,full_name,avatar_url,role),channel:channels!inner(name,slug,is_wins,staff_only_post),post_likes(user_id),comments(count)")
      .eq("channel.staff_only_post", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("events").select("*").gte("starts_at", new Date(Date.now() - 2 * 3600_000).toISOString()).order("starts_at").limit(1).maybeSingle(),
    supabase.from("leaderboard").select("user_id,full_name,avatar_url,points_month").order("points_month", { ascending: false }).limit(5),
  ]);

  const posts = (postsRaw ?? []) as unknown as FeedPost[];
  const feed: FeedItem[] = [
    ...notes.map((n) => ({ type: "note" as const, n, at: n.created_at })),
    ...posts.map((p) => ({ type: "post" as const, p, at: p.created_at })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);

  const seen = new Date(profile.notifications_seen_at ?? 0).getTime();
  const total = cur.ordered.length;
  const done = cur.ordered.filter((l) => cur.completed.has(l.id)).length;
  const lvl = level(pts.total);
  const ranked = (top ?? []).filter((r) => r.points_month > 0);

  return (
    <div className="fade-in grid xl:grid-cols-[minmax(0,1fr)_320px] gap-8 max-w-[1080px]">
      {/* ── Feed ── */}
      <div className="space-y-4 min-w-0">
        <h1 className="text-[28px] sm:text-[34px] leading-tight font-semibold tracking-[-0.035em]">
          Hola, {firstName(profile.full_name)}. <span className="em">A por ello.</span>
        </h1>

        {/* Seguir donde lo dejaste (móvil y tablet; en escritorio va en la columna) */}
        <div className="xl:hidden"><NextLessonCard cur={cur} done={done} total={total} /></div>

        <Link href="/comunidad/resultados" className="feed-card flex items-center gap-3 p-3 pl-4 hover:border-brand transition-colors">
          <Avatar name={profile.full_name} url={profile.avatar_url} size={38} />
          <span className="flex-1 rounded-full bg-bg px-4 py-2.5 text-[15px] text-ink-faint">¿Qué has conseguido esta semana?</span>
        </Link>

        <div className="flex items-center justify-between pt-2">
          <h2 className="font-semibold text-lg tracking-[-0.02em]">Novedades</h2>
          <Link href="/comunidad" className="text-sm text-ink-muted hover:text-ink">Comunidad</Link>
        </div>

        {feed.length === 0 && (
          <div className="feed-card p-8 text-center text-ink-muted">Todavía no hay novedades. Las clases nuevas, los directos y los avisos del equipo aparecerán aquí.</div>
        )}

        {feed.map((item) =>
          item.type === "note" ? (
            <NoteCard key={`n-${item.n.id}`} n={item.n} isNew={new Date(item.n.created_at).getTime() > seen} />
          ) : (
            <PostCard key={`p-${item.p.id}`} p={item.p} me={profile.id} />
          )
        )}
      </div>

      {/* ── Columna lateral ── */}
      <aside className="space-y-4 xl:sticky xl:top-10 h-fit">
        <section className="feed-card p-5">
          <div className="flex items-center gap-3">
            <Avatar name={profile.full_name} url={profile.avatar_url} size={52} />
            <div className="min-w-0">
              <p className="font-semibold truncate">{profile.full_name}</p>
              <p className="text-sm text-ink-muted">{lvl.name} · {pts.total} pts</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <ProgressBar value={lvl.pct} />
            <p className="text-xs text-ink-faint">{lvl.next ? `${lvl.toNext} pts para ${lvl.next}` : "Nivel máximo"}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 text-center border-t border-line pt-4">
            <Stat n={pts.rank ? `#${pts.rank}` : "–"} l="este mes" />
            <Stat n={`${done}`} l="clases" />
            <Stat n={`${pts.month}`} l="pts mes" />
          </div>
        </section>

        <div className="hidden xl:block"><NextLessonCard cur={cur} done={done} total={total} /></div>

        {nextEvent && (
          <section className="feed-card p-5 space-y-3">
            <p className="label flex items-center gap-2"><CalendarDays size={15} className="text-brand" /> Próximo directo</p>
            <div>
              <p className="font-semibold leading-snug">{nextEvent.title}</p>
              <p className="text-sm text-ink-muted capitalize">{fmtDateTime(nextEvent.starts_at)}</p>
            </div>
            {nextEvent.meeting_url ? (
              <a href={nextEvent.meeting_url} target="_blank" rel="noreferrer" className="btn btn-brand !py-2 w-full justify-center"><Video size={15} /> Entrar</a>
            ) : (
              <Link href="/eventos" className="btn btn-ghost !py-2 w-full justify-center">Ver calendario</Link>
            )}
          </section>
        )}

        <section className="feed-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label">Tus objetivos</p>
            <Link href="/perfil" className="text-xs text-ink-faint hover:text-ink">Editar</Link>
          </div>
          <ol className="space-y-2.5">
            {profile.objectives.map((o, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-snug">
                <span className="text-brand font-semibold">{i + 1}</span>
                <span>{o}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="feed-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="label flex items-center gap-2"><Trophy size={15} className="text-brand" /> Top del mes</p>
            <Link href="/ranking" className="text-xs text-ink-faint hover:text-ink">Ranking</Link>
          </div>
          {ranked.length === 0 ? (
            <p className="text-sm text-ink-muted">Nadie ha puntuado aún este mes.</p>
          ) : (
            <ul className="space-y-3">
              {ranked.map((r, i) => (
                <li key={r.user_id}>
                  <Link href={`/miembros/${r.user_id}`} className="flex items-center gap-3">
                    <span className="w-4 text-sm text-ink-faint tabular-nums">{i + 1}</span>
                    <Avatar name={r.full_name} url={r.avatar_url} size={30} />
                    <span className="flex-1 text-sm font-medium truncate">{r.full_name}</span>
                    <span className="text-sm text-ink-muted tabular-nums">{r.points_month}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-semibold tabular-nums">{n}</p>
      <p className="text-xs text-ink-faint">{l}</p>
    </div>
  );
}

function NextLessonCard({ cur, done, total }: { cur: Awaited<ReturnType<typeof getCurriculum>>; done: number; total: number }) {
  return (
    <section className="on-dark rounded-[20px] bg-bg-dark p-5 text-[#f5f4ef] space-y-4">
      <p className="text-sm text-[#a4a8a4]">{done === 0 ? "Empieza aquí" : "Sigue donde lo dejaste"}</p>
      {cur.next ? (
        <>
          <div>
            <p className="text-lg font-semibold leading-snug tracking-[-0.02em]">{cur.next.title}</p>
            <p className="text-sm text-[#a4a8a4] mt-0.5">{cur.next.module.title}</p>
          </div>
          <div className="space-y-1.5">
            <ProgressBar value={total ? done / total : 0} dark />
            <p className="text-xs text-[#a4a8a4]">{done} de {total} clases</p>
          </div>
          <Link href={`/formacion/leccion/${cur.next.id}`} className="btn bg-accent text-ink !py-2.5 w-full justify-center">
            <Play size={15} fill="currentColor" /> {done === 0 ? "Empezar" : "Continuar"}
          </Link>
        </>
      ) : (
        <p className="text-lg font-semibold">{total > 0 ? <>Formación completada. <span className="em">Bestia.</span></> : "Las clases llegan en breve."}</p>
      )}
    </section>
  );
}

function TrudAuthor({ at }: { at: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center w-10 h-10 rounded-full bg-bg-dark shrink-0">
        <Image src="/isotipo.png" alt="" width={24} height={18} />
      </span>
      <div>
        <p className="font-semibold leading-tight">Trud Sales</p>
        <p className="text-xs text-ink-faint">{timeAgo(at)}</p>
      </div>
    </div>
  );
}

function NoteCard({ n, isNew }: { n: Notification; isNew: boolean }) {
  const isMedia = n.kind === "leccion" || n.kind === "curso";
  const fromPerson = (n.kind === "anuncio" || n.kind === "aviso") && n.author;
  const body = (
    <article className={`feed-card p-5 space-y-4 transition-colors ${n.link ? "hover:border-brand" : ""}`}>
      <header className="flex items-start justify-between gap-3">
        {fromPerson ? (
          <div className="flex items-center gap-3">
            <Avatar name={n.author!.full_name} url={n.author!.avatar_url} size={40} />
            <div>
              <p className="font-semibold leading-tight">{n.author!.full_name} <span className="text-ink-faint font-normal">· Equipo</span></p>
              <p className="text-xs text-ink-faint">{timeAgo(n.created_at)}</p>
            </div>
          </div>
        ) : (
          <TrudAuthor at={n.created_at} />
        )}
        {isNew && <span className="badge !bg-accent-soft !text-brand-deep">Nuevo</span>}
      </header>

      {isMedia ? (
        <div className="on-dark rounded-[16px] bg-bg-dark p-5 sm:p-6 flex items-center gap-4 text-[#f5f4ef]">
          <span className="grid place-items-center w-12 h-12 rounded-full bg-accent text-ink shrink-0">
            <Play size={20} fill="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{n.title}</p>
            {n.body && <p className="text-sm text-[#a4a8a4] truncate">{n.body}</p>}
          </div>
        </div>
      ) : n.kind === "directo" ? (
        <div className="flex items-center gap-4 rounded-[16px] bg-accent-soft/60 p-4">
          <NotificationIcon kind="directo" size={44} />
          <div>
            <p className="font-semibold leading-snug">{n.title}</p>
            {n.body && <p className="text-sm text-ink-muted">{n.body}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {n.kind === "aviso" && <p className="font-semibold text-[17px] leading-snug">{n.title}</p>}
          {n.body && <p className="text-[15px] leading-relaxed whitespace-pre-line line-clamp-6">{n.body}</p>}
        </div>
      )}

      {n.link && (
        <p className="text-sm font-medium text-brand flex items-center gap-1">
          {isMedia ? "Ver clase" : n.kind === "directo" ? "Ver directos" : "Ver más"} <ArrowRight size={14} />
        </p>
      )}
    </article>
  );
  return n.link ? <Link href={n.link} className="block">{body}</Link> : body;
}

function PostCard({ p, me }: { p: FeedPost; me: string }) {
  const likes = p.post_likes.length;
  const liked = p.post_likes.some((l) => l.user_id === me);
  const comments = p.comments?.[0]?.count ?? 0;
  return (
    <Link href={`/comunidad/post/${p.id}`} className="block">
      <article className="feed-card p-5 space-y-3 hover:border-brand transition-colors">
        <header className="flex items-center gap-3">
          <Avatar name={p.author?.full_name} url={p.author?.avatar_url} size={40} />
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">
              {p.author?.full_name || "Miembro"}
              {p.author && p.author.role !== "alumno" && <span className="text-ink-faint font-normal"> · Equipo</span>}
            </p>
            <p className="text-xs text-ink-faint">{p.channel?.name} · {timeAgo(p.created_at)}</p>
          </div>
          {p.channel?.is_wins && <span className="ml-auto badge !bg-accent-soft !text-brand-deep"><Trophy size={12} /> Resultado</span>}
        </header>
        <p className="text-[15px] leading-relaxed whitespace-pre-line line-clamp-6 break-words">{p.body}</p>
        <footer className="flex items-center gap-5 text-sm text-ink-muted pt-1">
          <span className={`flex items-center gap-1.5 ${liked ? "text-brand" : ""}`}><Heart size={16} fill={liked ? "currentColor" : "none"} /> {likes}</span>
          <span className="flex items-center gap-1.5"><MessageCircle size={16} /> {comments}</span>
        </footer>
      </article>
    </Link>
  );
}
