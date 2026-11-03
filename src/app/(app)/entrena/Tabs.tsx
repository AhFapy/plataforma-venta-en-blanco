"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [["/entrena", "Entrena"], ["/entrena/liga", "Liga"], ["/entrena/insignias", "Insignias"], ["/ranking", "Ranking"]] as const;
const GAMES = ["/entrena/reto", "/entrena/ping-pong", "/entrena/lee", "/entrena/ordena", "/entrena/simulador"];

export function Tabs() {
  const path = usePathname();
  // Dentro de una partida no se muestran: se juega sin distracciones
  if (GAMES.some((g) => path.startsWith(g))) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} className={`rounded-full px-4 py-2 text-sm ${path === href ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted hover:text-ink"}`}>{label}</Link>
      ))}
    </div>
  );
}
