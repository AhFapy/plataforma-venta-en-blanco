import { BellRing, CalendarDays, Megaphone, PlayCircle, Sparkles, BookOpen } from "lucide-react";

const map = {
  leccion: { icon: PlayCircle, bg: "bg-brand-soft", fg: "text-brand-deep" },
  curso: { icon: BookOpen, bg: "bg-brand-soft", fg: "text-brand-deep" },
  directo: { icon: CalendarDays, bg: "bg-accent-soft", fg: "text-brand-deep" },
  anuncio: { icon: Megaphone, bg: "bg-bg-dark", fg: "text-accent" },
  aviso: { icon: Sparkles, bg: "bg-bg-dark", fg: "text-accent" },
  recordatorio: { icon: BellRing, bg: "bg-accent-soft", fg: "text-brand-deep" },
} as const;

export function NotificationIcon({ kind, size = 36 }: { kind: keyof typeof map; size?: number }) {
  const m = map[kind] ?? map.aviso;
  const Icon = m.icon;
  return (
    <span className={`grid place-items-center rounded-full shrink-0 ${m.bg} ${m.fg}`} style={{ width: size, height: size }}>
      <Icon size={size * 0.48} strokeWidth={1.9} />
    </span>
  );
}
