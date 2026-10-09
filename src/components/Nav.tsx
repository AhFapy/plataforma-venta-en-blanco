"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlayCircle, MessagesSquare, CalendarDays, Trophy, Users, Shield, LayoutGrid } from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/formacion", label: "Formación", icon: PlayCircle },
  { href: "/comunidad", label: "Comunidad", icon: MessagesSquare },
  { href: "/eventos", label: "Directos", icon: CalendarDays },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/aplicaciones", label: "Aplicaciones", icon: LayoutGrid },
  { href: "/miembros", label: "Miembros", icon: Users },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function SideNav({ staff }: { staff: boolean }) {
  const path = usePathname();
  const all = staff ? [...items, { href: "/admin", label: "Admin", icon: Shield }] : items;
  return (
    <nav className="space-y-1">
      {all.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition-colors ${
            active(path, href) ? "bg-ink text-bg" : "text-ink-muted hover:bg-bg-badge hover:text-ink"
          }`}
        >
          <Icon size={18} strokeWidth={1.8} /> {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  const mobile = items.filter((i) => i.href !== "/miembros" && i.href !== "/aplicaciones");
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {mobile.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active(path, href) ? "text-brand" : "text-ink-muted"}`}>
            <Icon size={21} strokeWidth={active(path, href) ? 2.2 : 1.7} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
