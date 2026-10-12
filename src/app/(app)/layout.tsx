import Link from "next/link";
import { Send } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { SideNav, BottomNav } from "@/components/Nav";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { getNotifications } from "@/lib/notifications";
import { ThemePicker } from "@/components/ThemePicker";
import { getSettings } from "@/lib/settings";
import { PopupGate } from "@/components/PopupGate";
import { getActivePopup } from "@/lib/popups";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireMember();

  // Última actividad (para detectar alumnos en riesgo). Como mucho una escritura cada 10 min.
  if (!profile.last_seen_at || Date.now() - new Date(profile.last_seen_at).getTime() > 10 * 60_000) {
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);
  }

  const staff = profile.role !== "alumno";
  const [notes, settings, popup, { data: unreadDm }] = await Promise.all([getNotifications(supabase, 12, profile.id), getSettings(supabase), getActivePopup(supabase, profile.id), supabase.rpc("unread_dm_count")]);
  const unread = Number(unreadDm ?? 0);
  const seenAt = profile.notifications_seen_at ?? new Date().toISOString();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex sticky top-0 z-40 h-dvh flex-col justify-between border-r border-line px-5 py-7">
        <div className="space-y-10">
          <div className="flex items-center justify-between pl-2">
            <Link href="/"><Logo size={18} /></Link>
            <NotificationBell items={notes} seenAt={seenAt} align="left" rosa={{ name: settings.rosa_name, avatar: settings.rosa_avatar_url }} />
          </div>
          <SideNav staff={staff} unread={unread} />
        </div>
        <div className="space-y-3">
          <Link href="/perfil" className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-surface">
            <Avatar name={profile.full_name} url={profile.avatar_url} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-ink-faint">Ver perfil</p>
            </div>
          </Link>
          <div className="flex items-center justify-between px-2">
            <SignOutButton className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink" />
            <ThemePicker compact />
          </div>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 backdrop-blur px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/"><Logo size={16} /></Link>
        <div className="flex items-center gap-1.5">
          {staff && <Link href="/admin" className="badge">Admin</Link>}
          <Link href="/mensajes" aria-label={`Mensajes${unread ? `, ${unread} sin leer` : ""}`} className="relative grid place-items-center w-10 h-10 rounded-full hover:bg-bg-badge">
            <Send size={20} strokeWidth={1.8} />
            {unread > 0 && <span className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-semibold grid place-items-center leading-none">{unread}</span>}
          </Link>
          <NotificationBell items={notes} seenAt={seenAt} rosa={{ name: settings.rosa_name, avatar: settings.rosa_avatar_url }} />
          <Link href="/perfil"><Avatar name={profile.full_name} url={profile.avatar_url} size={32} /></Link>
        </div>
      </header>

      <main className="px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-12 lg:py-10 max-w-6xl w-full min-w-0">{children}</main>
      <BottomNav />
      {popup && <PopupGate popup={popup} />}
    </div>
  );
}
