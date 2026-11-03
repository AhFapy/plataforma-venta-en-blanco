"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Crown, Eye, Flame, GraduationCap, Heart, ListOrdered, Medal, Phone, Shield, Trophy, Zap } from "lucide-react";
import type { NewBadge } from "@/lib/entrena/types";

const ICONS = { flame: Flame, crown: Crown, graduation: GraduationCap, zap: Zap, shield: Shield, eye: Eye, list: ListOrdered, phone: Phone, heart: Heart, medal: Medal, trophy: Trophy, award: Award };

export function BadgeIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? Award;
  return <Icon size={size} strokeWidth={1.8} />;
}

/** Medalla: redonda, con el verde de marca si está ganada y apagada si no. */
export function BadgeCoin({ icon, earned = true, size = 56 }: { icon: string; earned?: boolean; size?: number }) {
  return (
    <span className={`grid place-items-center rounded-full shrink-0 ${earned ? "bg-bg-dark text-accent" : "bg-bg-badge text-ink-faint"}`} style={{ width: size, height: size }}>
      <BadgeIcon icon={icon} size={Math.round(size * 0.44)} />
    </span>
  );
}

const CONFETTI = ["#c5ff5b", "#16734b", "#f5f4ef", "#2f9e68"];

/** Confeti hecho con CSS: pesa cero y se apaga solo. Se desactiva si el sistema pide menos movimiento. */
export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 36 }, (_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 0.35, dur: 1.5 + Math.random() * 1.1, color: CONFETTI[i % CONFETTI.length], size: 6 + Math.random() * 6, drift: (Math.random() - 0.5) * 120 })),
  );
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), 3200); return () => clearTimeout(t); }, []);
  if (!on) return null;
  return (
    <div aria-hidden className="confetti fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <span key={p.id} style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.5, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--drift" as string]: `${p.drift}px` }} />
      ))}
    </div>
  );
}

export function NewBadges({ badges }: { badges?: NewBadge[] }) {
  if (!badges?.length) return null;
  return (
    <div className="space-y-2">
      {badges.map((b) => (
        <div key={b.slug} className="pop-in feed-card p-4 flex items-center gap-4">
          <BadgeCoin icon={b.icon} size={52} />
          <div className="min-w-0">
            <p className="label">Insignia nueva{b.points > 0 ? ` · +${b.points} pts` : ""}</p>
            <p className="font-semibold tracking-[-0.01em]">{b.name}</p>
            <p className="text-sm text-ink-muted">{b.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Lives({ lives, total = 3 }: { lives: number; total?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${lives} vidas`}>
      {Array.from({ length: total }, (_, i) => <Heart key={i} size={18} className={i < lives ? "text-brand fill-brand" : "text-ink-faint"} strokeWidth={1.8} />)}
    </span>
  );
}

export function BackToHub() {
  return <Link href="/entrena" className="btn btn-ghost">Volver a Entrena</Link>;
}

export function CtaArrow({ href, children, className = "btn btn-dark" }: { href: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} className={className}>{children} <ArrowRight size={15} /></Link>;
}

export const vibrate = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* no disponible */ } };
