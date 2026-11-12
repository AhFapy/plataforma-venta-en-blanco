import { requireCsm } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { fmtDateTime } from "@/lib/utils";
import { Moderate } from "./Moderate";
import { Linkify } from "@/components/Linkify";

export const metadata = { title: "Testimonios · Seguimiento" };

type T = { id: string; body: string; kind: string; status: string; updated_at: string; published_at: string | null; author: { full_name: string | null; avatar_url: string | null } | null };

export default async function ModerateTestimonials() {
  const { supabase } = await requireCsm();
  const { data } = await supabase.from("testimonials")
    .select("id,body,kind,status,updated_at,published_at,author:profiles!testimonials_user_id_fkey(full_name,avatar_url)")
    .in("status", ["enviado", "publicado"]).order("updated_at", { ascending: false });
  const rows = (data ?? []) as unknown as T[];
  const pending = rows.filter((r) => r.status === "enviado");
  const published = rows.filter((r) => r.status === "publicado");

  const Card = ({ t }: { t: T }) => (
    <article className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={t.author?.full_name} url={t.author?.avatar_url} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{t.author?.full_name ?? "—"}</p>
          <p className="text-xs text-ink-faint">{t.kind === "tangible" ? "Resultado tangible" : "Resultado no tangible"} · {fmtDateTime(t.published_at ?? t.updated_at)}</p>
        </div>
      </div>
      <p className="text-[15px] whitespace-pre-line break-words"><Linkify text={t.body} /></p>
      <Moderate id={t.id} status={t.status} />
    </article>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader title="Testimonios por" emphasis="revisar." />
      <section className="space-y-3">
        {pending.length === 0 && <p className="text-sm text-ink-muted">No hay testimonios esperando revisión.</p>}
        {pending.map((t) => <Card key={t.id} t={t} />)}
      </section>
      {published.length > 0 && (
        <section className="space-y-3">
          <p className="label">Publicados</p>
          {published.map((t) => <Card key={t.id} t={t} />)}
        </section>
      )}
    </div>
  );
}
