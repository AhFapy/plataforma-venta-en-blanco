import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/Avatar";
import { Thread, type ThreadMsg } from "@/app/(app)/mensajes/[userId]/Thread";
import { markReadAsRosa, rosaId, sendAsRosa } from "../actions";

export default async function RosaConversation({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  await requireStaff();
  const id = await rosaId();
  if (!id || !/^[0-9a-f-]{36}$/i.test(userId)) notFound();
  const admin = createAdminClient();
  const { data: other } = await admin.from("profiles").select("id,full_name,avatar_url,active").eq("id", userId).maybeSingle();
  if (!other) notFound();
  const [a, b] = [id, userId].sort();
  const { data: conv } = await admin.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  const { data: msgs } = conv
    ? await admin.from("messages").select("id,sender_id,body,created_at,read_at,story_media_url,story_media_type").eq("conversation_id", conv.id).order("created_at").limit(500)
    : { data: [] };

  return (
    <div className="max-w-2xl flex flex-col h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-10rem)]">
      <header className="flex items-center gap-3 pb-4 border-b border-line">
        <Link href="/admin/rosa" className="grid place-items-center w-9 h-9 rounded-full hover:bg-bg-badge" aria-label="Volver"><ArrowLeft size={18} /></Link>
        <Link href={`/admin/alumnos/${other.id}`} className="flex items-center gap-3 min-w-0">
          <Avatar name={other.full_name} url={other.avatar_url} size={40} />
          <div className="min-w-0"><p className="font-semibold truncate">{other.full_name}</p><p className="text-xs text-ink-muted">Contestas como Rosa</p></div>
        </Link>
      </header>
      <Thread me={id} to={other.id} conversationId={conv?.id ?? null} messages={(msgs ?? []) as ThreadMsg[]} canSend={!!other.active} onSend={sendAsRosa} onRead={markReadAsRosa} />
    </div>
  );
}
