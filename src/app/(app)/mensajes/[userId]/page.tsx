import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Thread, type ThreadMsg } from "./Thread";

export const metadata = { title: "Mensajes" };

export default async function Conversation({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, profile } = await requireMember();
  if (userId === profile.id || !/^[0-9a-f-]{36}$/i.test(userId)) notFound();
  const { data: other } = await supabase.from("profiles").select("id,full_name,avatar_url,role,active").eq("id", userId).maybeSingle();
  if (!other) notFound();
  const [a, b] = [profile.id, userId].sort();
  const { data: conv } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  const { data: msgs } = conv
    ? await supabase.from("messages").select("id,sender_id,body,created_at,read_at,story_media_url,story_media_type").eq("conversation_id", conv.id).order("created_at").limit(500)
    : { data: [] };

  return (
    <div className="fade-in max-w-2xl flex flex-col h-[calc(100dvh-11rem-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-5rem)]">
      <header className="flex items-center gap-3 pb-4 border-b border-line">
        <Link href="/mensajes" className="grid place-items-center w-9 h-9 rounded-full hover:bg-bg-badge" aria-label="Volver"><ArrowLeft size={18} /></Link>
        <Link href={`/miembros/${other.id}`} className="flex items-center gap-3 min-w-0">
          <Avatar name={other.full_name} url={other.avatar_url} size={40} />
          <div className="min-w-0">
            <p className="font-semibold truncate">{other.full_name || "Miembro"}</p>
            {other.role !== "alumno" && <p className="text-xs text-brand">Equipo</p>}
          </div>
        </Link>
      </header>
      <Thread me={profile.id} to={other.id} conversationId={conv?.id ?? null} messages={(msgs ?? []) as ThreadMsg[]} canSend={!!other.active} />
    </div>
  );
}
