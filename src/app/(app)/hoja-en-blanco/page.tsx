import Link from "next/link";
import { ArrowRight, ExternalLink, FileText, Paperclip } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { timeAgo } from "@/lib/utils";
import { NotesBoard, type Folder, type Note } from "./NotesBoard";

export const metadata = { title: "Hoja en Blanco" };

const TABS = [
  { id: "notas", label: "Hoja en blanco" },
  { id: "deberes", label: "Mis deberes" },
  { id: "recursos", label: "Recursos" },
] as const;

export default async function HojaEnBlanco({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const tab = TABS.some((x) => x.id === t) ? (t as (typeof TABS)[number]["id"]) : "notas";
  const { supabase, profile } = await requireMember();

  return (
    <div className="fade-in space-y-8 max-w-5xl">
      <header className="space-y-2">
        <h1 className="text-[34px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-0.035em]">Hoja en <span className="em">Blanco</span></h1>
        <p className="text-ink-muted max-w-2xl">Tu cuaderno de la formación: escribe y ordena tus notas, repasa los deberes que has entregado y tira de los recursos del equipo.</p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <Link key={id} href={`/hoja-en-blanco?t=${id}`} className={`rounded-full px-4 py-2 text-sm ${tab === id ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>

      {tab === "notas" && <Notes />}
      {tab === "deberes" && <Homework />}
      {tab === "recursos" && <Resources />}
    </div>
  );

  async function Notes() {
    const [{ data: folders }, { data: notes }] = await Promise.all([
      supabase.from("note_folders").select("id,name").eq("user_id", profile.id).order("created_at"),
      supabase.from("notes").select("id,folder_id,title,body,updated_at").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(500),
    ]);
    return <NotesBoard folders={(folders ?? []) as Folder[]} notes={(notes ?? []) as Note[]} />;
  }

  async function Homework() {
    const [cur, { data: subs }] = await Promise.all([
      getCurriculum(supabase, profile),
      supabase.from("submissions").select("lesson_id,body,file_path,file_name,feedback,updated_at").eq("user_id", profile.id),
    ]);
    const byLesson = new Map((subs ?? []).map((s) => [s.lesson_id, s]));
    const paths = (subs ?? []).map((s) => s.file_path).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data } = await supabase.storage.from("deberes").createSignedUrls(paths, 3600);
      for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
    }

    const groups = cur.courses
      .map((c) => ({ course: c, items: cur.ordered.filter((l) => l.course.id === c.id && byLesson.has(l.id)) }))
      .filter((g) => g.items.length > 0);
    const corrected = (subs ?? []).filter((s) => s.feedback).length;

    if (!groups.length) {
      return (
        <section className="feed-card p-8 text-center space-y-3">
          <p className="text-lg font-semibold">Aún no has entregado ningún deber</p>
          <p className="text-ink-muted max-w-md mx-auto">Al final de cada clase tienes una caja para entregar el ejercicio: texto, un PDF, un audio… Todo lo que entregues aparece aquí.</p>
          {cur.next && <Link href={`/formacion/leccion/${cur.next.id}`} className="btn btn-dark inline-flex">Ir a mi próxima clase <ArrowRight size={15} /></Link>}
        </section>
      );
    }

    return (
      <div className="space-y-8">
        <p className="text-sm text-ink-muted">{subs?.length} {subs?.length === 1 ? "deber entregado" : "deberes entregados"} · {corrected} {corrected === 1 ? "corregido" : "corregidos"}</p>
        {groups.map(({ course, items }) => (
          <section key={course.id} className="space-y-3">
            <p className="label">{course.title}</p>
            {items.map((l) => {
              const s = byLesson.get(l.id)!;
              const url = s.file_path ? signed.get(s.file_path) : undefined;
              return (
                <article key={l.id} className="feed-card p-5 space-y-3">
                  <header className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-ink-faint">{l.module.title} · {timeAgo(s.updated_at)}</p>
                      <Link href={`/formacion/leccion/${l.id}#deber`} className="font-semibold hover:text-brand">{l.title}</Link>
                    </div>
                    {s.feedback
                      ? <span className="badge !bg-accent-soft !text-brand-deep">Corregido</span>
                      : <span className="badge">Pendiente de revisión</span>}
                  </header>
                  {s.body && <p className="text-[15px] leading-relaxed whitespace-pre-line line-clamp-6 break-words">{s.body}</p>}
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-bg-badge px-3 py-1.5 text-sm hover:text-brand max-w-full">
                      <Paperclip size={14} className="shrink-0" /><span className="truncate">{s.file_name}</span>
                    </a>
                  )}
                  {s.feedback && (
                    <div className="rounded-[16px] bg-accent-soft p-4">
                      <p className="text-sm font-semibold text-brand-deep mb-1">Corrección del equipo</p>
                      <p className="text-[15px] leading-relaxed whitespace-pre-line">{s.feedback}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    );
  }

  async function Resources() {
    const { data } = await supabase.from("library_resources").select("*").order("category").order("position").order("created_at");
    const rows = (data ?? []) as { id: string; category: string; title: string; description: string | null; url: string | null; file_path: string | null; file_name: string | null }[];
    const paths = rows.map((r) => r.file_path).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: s } = await supabase.storage.from("recursos").createSignedUrls(paths, 3600);
      for (const d of s ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
    }
    if (!rows.length) {
      return (
        <section className="feed-card p-8 text-center space-y-2">
          <p className="text-lg font-semibold">Pronto habrá recursos aquí</p>
          <p className="text-ink-muted">Guiones, plantillas y material de ventas que el equipo irá subiendo.</p>
        </section>
      );
    }
    const cats = [...new Set(rows.map((r) => r.category))];
    return (
      <div className="space-y-8">
        {cats.map((c) => (
          <section key={c} className="space-y-3">
            <p className="label">{c}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {rows.filter((r) => r.category === c).map((r) => {
                const href = r.file_path ? signed.get(r.file_path) : r.url;
                return (
                  <a key={r.id} href={href ?? "#"} target="_blank" rel="noreferrer" className="feed-card p-5 flex gap-4 hover:border-brand transition-colors">
                    <span className="grid place-items-center w-10 h-10 shrink-0 rounded-[12px] bg-accent-soft text-brand-deep">
                      {r.file_path ? <FileText size={18} /> : <ExternalLink size={18} />}
                    </span>
                    <span className="min-w-0 space-y-1">
                      <span className="block font-semibold leading-snug">{r.title}</span>
                      {r.description && <span className="block text-sm text-ink-muted leading-snug line-clamp-3">{r.description}</span>}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }
}
