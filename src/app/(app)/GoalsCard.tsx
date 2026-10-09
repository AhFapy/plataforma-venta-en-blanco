"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { logGoalProgress } from "./goals-actions";

type Kind = "objective" | "improvement";

function Row({ kind, i, text, v, bump }: { kind: Kind; i: number; text: string; v: number; bump: (k: Kind, i: number, d: 1 | -1) => void }) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-[15px] leading-snug">{text}</span>
        <span className="text-xs text-ink-faint tabular-nums pt-0.5">{v}%</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => bump(kind, i, -1)} disabled={v === 0} className="grid place-items-center w-6 h-6 rounded-full bg-bg-badge text-ink-muted disabled:opacity-30" aria-label="Quitar avance"><Minus size={12} /></button>
        <div className="flex-1 h-1.5 rounded-full bg-bg-badge overflow-hidden">
          <div className={`h-full rounded-full transition-[width] duration-500 ${kind === "objective" ? "bg-brand" : "bg-accent"}`} style={{ width: `${v}%` }} />
        </div>
        <button onClick={() => bump(kind, i, 1)} disabled={v === 100} className="grid place-items-center w-6 h-6 rounded-full bg-brand text-white disabled:opacity-30" aria-label="He avanzado hoy"><Plus size={12} /></button>
      </div>
    </li>
  );
}


export function GoalsCard({ objectives, improvements, objectivesProgress, improvementsProgress }: {
  objectives: string[]; improvements: string[]; objectivesProgress: number[]; improvementsProgress: number[];
}) {
  const [prog, setProg] = useState({ objective: [...objectivesProgress], improvement: [...improvementsProgress] });
  const [flash, setFlash] = useState<string | null>(null);
  const [, start] = useTransition();

  const all = [...prog.objective.slice(0, objectives.length), ...prog.improvement.slice(0, improvements.length)];
  const overall = all.length ? Math.round(all.reduce((a, b) => a + (b ?? 0), 0) / all.length) : 0;

  function bump(kind: Kind, i: number, dir: 1 | -1) {
    setProg((p) => {
      const arr = [...p[kind]];
      arr[i] = Math.max(0, Math.min(100, (arr[i] ?? 0) + dir * 10));
      return { ...p, [kind]: arr };
    });
    start(async () => {
      const r = await logGoalProgress(kind, i, dir);
      if (r.awarded) { setFlash("+2 pts por tu avance de hoy"); setTimeout(() => setFlash(null), 2200); }
    });
  }

  return (
    <section className="feed-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="label">Tus objetivos</p>
        <Link href="/perfil" className="text-xs text-ink-faint hover:text-ink">Editar</Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0" aria-label={`${overall}% completado`}>
          <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--bg-badge)" strokeWidth="4" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(overall / 100) * 97.4} 97.4`} className="transition-[stroke-dasharray] duration-500" />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">{overall}%</span>
        </div>
        <p className="text-sm text-ink-muted leading-snug">Pulsa <b className="text-ink">+</b> cada día que avances. Tu primer avance del día suma 2 puntos.</p>
      </div>
      {flash && <p className="rounded-full bg-accent text-on-accent px-3 py-1.5 text-sm font-semibold w-fit fade-in">{flash}</p>}

      <ol className="space-y-4">
        {objectives.map((o, i) => <Row key={`o${i}`} kind="objective" i={i} text={o} v={prog.objective[i] ?? 0} bump={bump} />)}
      </ol>

      {improvements.length > 0 && (
        <div className="space-y-3 border-t border-line pt-4">
          <p className="label">Puntos a mejorar</p>
          <ol className="space-y-4">
            {improvements.map((o, i) => <Row key={`m${i}`} kind="improvement" i={i} text={o} v={prog.improvement[i] ?? 0} bump={bump} />)}
          </ol>
        </div>
      )}
    </section>
  );
}
