import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { SideNav, BottomNav } from "@/components/Nav";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireMember();

  // Última actividad (para detectar alumnos en riesgo). Como mucho una escritura cada 10 min.
  if (!profile.last_seen_at || Date.now() - new Date(profile.last_seen_at).getTime() > 10 * 60_000) {
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);
  }

  const staff = profile.role !== "alumno";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex sticky top-0 h-dvh flex-col justify-between border-r border-line px-5 py-7">
        <div className="space-y-10">
          <Link href="/" className="px-2 block"><Logo size={18} /></Link>
          <SideNav staff={staff} />
        </div>
        <div className="space-y-3">
          <Link href="/perfil" className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-bg-alt">
            <Avatar name={profile.full_name} url={profile.avatar_url} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-ink-faint">Ver perfil</p>
            </div>
          </Link>
          <SignOutButton className="flex items-center gap-2 px-3 text-sm text-ink-muted hover:text-ink" />
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 backdrop-blur px-4 py-3">
        <Link href="/"><Logo size={16} /></Link>
        <div className="flex items-center gap-3">
          {staff && <Link href="/admin" className="badge">Admin</Link>}
          <Link href="/perfil"><Avatar name={profile.full_name} url={profile.avatar_url} size={32} /></Link>
        </div>
      </header>

      <main className="px-4 pt-6 pb-28 sm:px-8 lg:px-12 lg:py-10 max-w-6xl w-full">{children}</main>
      <BottomNav />
    </div>
  );
}
