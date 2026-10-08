"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChannelTabs({ channels }: { channels: { slug: string; name: string; emoji: string | null }[] }) {
  const path = usePathname();
  const current = path.split("/")[2] ?? channels[0]?.slug;
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
      <div className="flex gap-2 w-max">
        {channels.map((c) => (
          <Link
            key={c.slug}
            href={`/comunidad/${c.slug}`}
            className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors ${current === c.slug ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted hover:text-ink"}`}
          >
            {c.emoji} {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
