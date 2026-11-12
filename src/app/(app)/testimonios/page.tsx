import { requireMember } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { fmtDate } from "@/lib/utils";
import { MyTestimonial } from "./MyTestimonial";
import { Linkify } from "@/components/Linkify";

export const metadata = { title: "Testimonios" };

type T = { id: string; body: string; kind: string; published_at: string; author: { full_name: string | null; avatar_url: string | null } | null };

export default async function Testimonials() {
  const { supabase, profile } = await requireMember();
  const [{ data: mine }, { data }] = await Promise.all([
    supabase.from("testimonials").select("body,kind,status,review_note").eq("user_id", profile.id).maybeSingle(),
    supabase.from("testimonials").select("id,body,kind,published_at,author:profiles!testimonials_user_id_fkey(full_name,avatar_url)").eq("status", "publicado").order("published_at", { ascending: false }),
  ]);
  const list = (data ?? []) as unknown as T[];

  return (
    <div className="fade-in space-y-8 max-w-3xl">
      <PageHeader title="Testimonios" emphasis="reales." />

      {profile.role === "alumno" && (
        <section className="card p-6 space-y-4">
          <p className="label">Tu testimonio</p>
          <MyTestimonial mine={mine} />
        </section>
      )}

      <section className="space-y-4">
        {list.length === 0 && <p className="text-ink-muted">Todavía no hay testimonios publicados.</p>}
        {list.map((t) => (
          <article key={t.id} className="card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={t.author?.full_name} url={t.author?.avatar_url} size={40} />
              <div className="min-w-0">
                <p className="font-medium truncate">{t.author?.full_name ?? "Alumno"}</p>
                <p className="text-xs text-ink-faint">{t.kind === "tangible" ? "Resultado tangible" : "Resultado no tangible"} · {fmtDate(t.published_at)}</p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed whitespace-pre-line break-words"><Linkify text={t.body} /></p>
          </article>
        ))}
      </section>
    </div>
  );
}
