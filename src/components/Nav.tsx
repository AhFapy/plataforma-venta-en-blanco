"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlayCircle, MessagesSquare, CalendarDays, Trophy, Users, Shield, LayoutGrid, NotebookPen, Send } from "lucide-react";

const items: { href: string; label: string; short?: string; icon: typeof Home }[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/formacion", label: "Formación", icon: PlayCircle },
  { href: "/comunidad", label: "Comunidad", icon: MessagesSquare },
  { href: "/mensajes", label: "Mensajes", icon: Send },
  { href: "/eventos", label: "Directos", icon: CalendarDays },
  { href: "/hoja-en-blanco", label: "Hoja en Blanco", short: "Hoja", icon: NotebookPen },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/aplicaciones", label: "Aplicaciones", icon: LayoutGrid },
  { href: "/miembros", label: "Miembros", icon: Users },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function SideNav({ staff, unread = 0, community = 0 }: { staff: boolean; unread?: number; community?: number }) {
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
          {href === "/mensajes" && unread > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-semibold grid place-items-center">{unread}</span>}
          {href === "/comunidad" && community > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-semibold grid place-items-center" title={`${community} publicaciones nuevas`}>{community > 99 ? "99+" : community}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ community = 0 }: { community?: number }) {
  const path = usePathname();
  const mobile = items.filter((i) => i.href !== "/miembros" && i.href !== "/aplicaciones" && i.href !== "/mensajes");
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-bg/95 backdrop-blur pb-[max(env(safe-area-inset-bottom),6px)]">
      <div className="grid grid-cols-6">
        {mobile.map(({ href, label, short, icon: Icon }) => (
          <Link key={href} href={href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${active(path, href) ? "text-brand" : "text-ink-muted"}`}>
            <span className="relative">
              <Icon size={21} strokeWidth={active(path, href) ? 2.2 : 1.7} />
              {href === "/comunidad" && community > 0 && <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-semibold grid place-items-center leading-none">{community > 99 ? "99+" : community}</span>}
            </span>
            {short ?? label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
