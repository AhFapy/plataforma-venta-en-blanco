import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Mensajes" };

type Conv = { id: string; user_a: string; user_b: string; last_message_at: string };
type Msg = { conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null; story_media_url: string | null };

export default async function Inbox() {
  const { supabase, profile } = await requireMember();
  const { data: convs } = await supabase.from("conversations").select("id,user_a,user_b,last_message_at").order("last_message_at", { ascending: false }).limit(100);
  const list = (convs ?? []) as Conv[];
  const others = list.map((c) => (c.user_a === profile.id ? c.user_b : c.user_a));
  const [{ data: people }, { data: msgs }] = list.length ? await Promise.all([
    supabase.from("profiles").select("id,full_name,avatar_url,role").in("id", others),
    supabase.from("messages").select("conversation_id,sender_id,body,created_at,read_at,story_media_url").in("conversation_id", list.map((c) => c.id)).order("created_at", { ascending: false }).limit(1000),
  ]) : [{ data: [] }, { data: [] }];
  const byId = new Map((people ?? []).map((p) => [p.id as string, p]));
  const last = new Map<string, Msg>();
  const unread = new Map<string, number>();
  for (const m of (msgs ?? []) as Msg[]) {
    if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
    if (m.sender_id !== profile.id && !m.read_at) unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
  }

  return (
    <div className="fade-in max-w-2xl">
      <PageHeader label="Mensajes" title="Tus" emphasis="conversaciones." />
      {list.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="font-semibold">Aún no tienes mensajes</p>
          <p className="text-ink-muted text-sm">Responde a una historia o entra en el perfil de alguien desde <Link href="/miembros" className="text-brand">Miembros</Link> y escríbele.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {list.map((c, i) => {
            const other = byId.get(others[i]);
            const m = last.get(c.id);
            const n = unread.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/mensajes/${others[i]}`} className="flex items-center gap-3 p-4 hover:bg-bg">
                  <Avatar name={other?.full_name} url={other?.avatar_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate ${n ? "font-semibold" : "font-medium"}`}>{other?.full_name || "Miembro"}</p>
                      <span className="text-xs text-ink-faint shrink-0">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className={`text-sm truncate ${n ? "text-ink" : "text-ink-muted"}`}>
                      {m ? `${m.sender_id === profile.id ? "Tú: " : ""}${m.story_media_url ? "Respondió a una historia · " : ""}${m.body}` : ""}
                    </p>
                  </div>
                  {n > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand text-white text-xs font-semibold grid place-items-center">{n}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
