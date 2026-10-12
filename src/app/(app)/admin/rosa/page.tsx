import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/Avatar";
import { RosaAvatar } from "@/components/RosaAvatar";
import { timeAgo } from "@/lib/utils";
import { rosaId } from "./actions";
import { RosaStoryUpload } from "./RosaStoryUpload";

export const metadata = { title: "Rosa" };

export default async function RosaAdmin() {
  await requireStaff();
  const id = await rosaId();
  if (!id) return <p className="text-ink-muted">Falta el perfil de Rosa.</p>;
  const admin = createAdminClient();
  const [{ data: rosa }, { data: convs }, { data: stories }] = await Promise.all([
    admin.from("profiles").select("full_name,avatar_url").eq("id", id).maybeSingle(),
    admin.from("conversations").select("id,user_a,user_b,last_message_at").or(`user_a.eq.${id},user_b.eq.${id}`).order("last_message_at", { ascending: false }).limit(200),
    admin.from("stories").select("id,media_type,caption,created_at,expires_at").eq("author_id", id).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ]);
  const list = convs ?? [];
  const others = list.map((c) => (c.user_a === id ? c.user_b : c.user_a));
  const [{ data: people }, { data: msgs }] = list.length ? await Promise.all([
    admin.from("profiles").select("id,full_name,avatar_url").in("id", others),
    admin.from("messages").select("conversation_id,sender_id,body,created_at,read_at").in("conversation_id", list.map((c) => c.id)).order("created_at", { ascending: false }).limit(2000),
  ]) : [{ data: [] }, { data: [] }];
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
  const last = new Map<string, { sender_id: string; body: string }>();
  const unread = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
    if (m.sender_id !== id && !m.read_at) unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="card p-6 flex items-center gap-4">
        <RosaAvatar url={rosa?.avatar_url} size={56} />
        <div>
          <p className="text-xl font-semibold tracking-[-0.02em]">{rosa?.full_name}</p>
          <p className="text-sm text-ink-muted">Aquí el equipo publica historias como Rosa y contesta sus mensajes privados.</p>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <p className="label">Nueva historia de Rosa</p>
        <RosaStoryUpload />
        {(stories ?? []).length > 0 && (
          <p className="text-sm text-ink-muted">Activas ahora: {(stories ?? []).length} · la última {timeAgo((stories ?? [])[0].created_at)}</p>
        )}
      </section>

      <section className="space-y-3">
        <p className="label">Mensajes a Rosa</p>
        {list.length === 0 ? (
          <p className="card p-6 text-sm text-ink-muted">Nadie le ha escrito todavía.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {list.map((c, i) => {
              const o = byId.get(others[i]); const m = last.get(c.id); const n = unread.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link href={`/admin/rosa/${others[i]}`} className="flex items-center gap-3 p-4 hover:bg-bg">
                    <Avatar name={o?.full_name} url={o?.avatar_url} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2"><p className={`truncate ${n ? "font-semibold" : "font-medium"}`}>{o?.full_name || "Miembro"}</p><span className="text-xs text-ink-faint shrink-0">{timeAgo(c.last_message_at)}</span></div>
                      <p className="text-sm text-ink-muted truncate">{m ? `${m.sender_id === id ? "Rosa: " : ""}${m.body}` : ""}</p>
                    </div>
                    {n > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand text-white text-xs font-semibold grid place-items-center">{n}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
