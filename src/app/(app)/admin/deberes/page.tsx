import Link from "next/link";
import { Paperclip } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import { ActionForm } from "../ActionForm";
import { saveFeedback } from "../extra-actions";

export const metadata = { title: "Deberes" };

type Row = {
  id: string; body: string | null; file_path: string | null; file_name: string | null; feedback: string | null; updated_at: string;
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
  lesson: { id: string; title: string } | null;
};

export default async function AdminHomework({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = f === "todos" ? "todos" : "pendientes";
  const { supabase } = await requireStaff();
  let q = supabase
    .from("submissions")
    .select("id,body,file_path,file_name,feedback,updated_at,user:profiles!submissions_user_id_fkey(id,full_name,avatar_url),lesson:lessons(id,title)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (filter === "pendientes") q = q.is("feedback", null);
  const [{ data }, { count: pending }] = await Promise.all([
    q,
    supabase.from("submissions").select("id", { count: "exact", head: true }).is("feedback", null),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const paths = rows.map((r) => r.file_path).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: s } = await supabase.storage.from("deberes").createSignedUrls(paths, 3600);
    for (const d of s ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Deberes</h1>
        <p className="text-ink-muted mt-1 max-w-2xl">Lo que entregan los alumnos al final de cada clase. Al corregir, Rosa le avisa y la corrección le aparece en la clase y en su Hoja en Blanco.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/admin/deberes" className={`rounded-full px-4 py-2 text-sm ${filter === "pendientes" ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted"}`}>Sin corregir · {pending ?? 0}</Link>
        <Link href="/admin/deberes?f=todos" className={`rounded-full px-4 py-2 text-sm ${filter === "todos" ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted"}`}>Todos</Link>
      </div>
      {rows.length === 0 && <p className="text-sm text-ink-faint">{filter === "pendientes" ? "Nada pendiente de corregir." : "Aún no hay entregas."}</p>}
      <div className="space-y-4">
        {rows.map((r) => {
          const url = r.file_path ? signed.get(r.file_path) : undefined;
          return (
            <article key={r.id} className="card p-5 space-y-3">
              <header className="flex flex-wrap items-center gap-3">
                <Avatar name={r.user?.full_name} url={r.user?.avatar_url} size={36} />
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{r.user?.full_name || "Alumno"}</p>
                  <p className="text-xs text-ink-faint">{r.lesson?.title} · {timeAgo(r.updated_at)}</p>
                </div>
                {r.feedback && <span className="ml-auto badge !bg-accent-soft !text-brand-deep">Corregido</span>}
              </header>
              {r.body && <p className="text-[15px] leading-relaxed whitespace-pre-line break-words">{r.body}</p>}
              {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-bg-badge px-3 py-1.5 text-sm hover:text-brand"><Paperclip size={14} /> {r.file_name}</a>}
              <ActionForm action={saveFeedback} submit={r.feedback ? "Actualizar corrección" : "Enviar corrección"}>
                <input type="hidden" name="id" value={r.id} />
                <textarea name="feedback" rows={3} className="input" defaultValue={r.feedback ?? ""} placeholder="Qué está bien, qué cambiarías y cómo…" />
              </ActionForm>
            </article>
          );
        })}
      </div>
    </div>
  );
}
