"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Lock, X } from "lucide-react";
import { orderSubmit } from "../../actions";
import { BackToHub, Confetti, CtaArrow, NewBadges, vibrate } from "../../ui";
import type { OrderLevel, OrderResult } from "@/lib/entrena/types";

export function Order({ level, nextSlug }: { level: OrderLevel; nextSlug: string | null }) {
  const n = level.steps.length;
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(n).fill(null));
  const [locked, setLocked] = useState<boolean[]>(() => Array(n).fill(false));
  const [wrong, setWrong] = useState<boolean[]>(() => Array(n).fill(false));
  const [res, setRes] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pool = level.steps.filter((s) => !slots.includes(s));
  const full = slots.every(Boolean);
  const solved = res?.solved;

  function put(step: string) {
    const i = slots.findIndex((s) => s === null);
    if (i < 0) return;
    setSlots(slots.map((s, k) => (k === i ? step : s)));
    setWrong(Array(n).fill(false));
    vibrate(8);
  }
  function take(i: number) {
    if (locked[i] || solved) return;
    setSlots(slots.map((s, k) => (k === i ? null : s)));
    setWrong(Array(n).fill(false));
  }
  function submit() {
    setError(null);
    start(async () => {
      const r = await orderSubmit(level.slug, slots as string[]);
      if (r.error || !r.data) return setError(r.error ?? "Error");
      setRes(r.data);
      setLocked(r.data.marks);
      setWrong(r.data.marks.map((m) => !m));
      vibrate(r.data.solved ? [20, 40, 20] : [30, 40, 30]);
    });
  }
  function clearWrong() {
    setSlots(slots.map((s, k) => (locked[k] ? s : null)));
    setWrong(Array(n).fill(false));
    setRes(null);
  }

  return (
    <div className="space-y-5">
      {solved && res && res.attempts === 1 && <Confetti />}
      <ol className="space-y-2">
        {slots.map((s, i) => (
          <li key={i}>
            <button type="button" onClick={() => take(i)} disabled={!s || locked[i]}
              className={`w-full flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left text-[15px] min-h-[52px] transition-colors ${locked[i] ? "border-brand bg-brand-soft" : wrong[i] ? "border-red-700/50 bg-red-700/10 shake" : s ? "border-ink-faint bg-surface" : "border-dashed border-line text-ink-faint"}`}>
              <span className={`grid place-items-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 tabular-nums ${locked[i] ? "bg-brand text-white" : "bg-bg-badge text-ink-muted"}`}>{locked[i] ? <Check size={14} /> : i + 1}</span>
              <span className="flex-1">{s ?? "Toca una fase de abajo"}</span>
              {locked[i] ? <Lock size={14} className="text-brand" /> : wrong[i] ? <X size={16} className="text-red-700" /> : null}
            </button>
          </li>
        ))}
      </ol>

      {!solved && pool.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pool.map((s) => (
            <button key={s} type="button" onClick={() => put(s)} className="rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] hover:border-brand transition-colors">{s}</button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!solved && (
        res ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-dark" onClick={clearWrong}>Corregir las rojas</button>
            <p className="text-sm text-ink-muted">{res.good} de {res.total} en su sitio</p>
          </div>
        ) : (
          <button type="button" className="btn btn-dark" onClick={submit} disabled={!full || pending}>{pending ? "Comprobando…" : "Comprobar"} <ArrowRight size={15} /></button>
        )
      )}

      {solved && res && (
        <div className="pop-in space-y-4">
          <section className="rounded-[20px] bg-bg-dark on-dark text-[#f5f4ef] p-6 space-y-2">
            <p className="text-sm text-[#a4a8a4]">{res.attempts === 1 ? "A la primera" : `Resuelto en ${res.attempts} intentos`} · +{res.xp} XP</p>
            <p className="text-lg">{res.explanation}</p>
          </section>
          <NewBadges badges={res.badges} />
          <div className="flex flex-wrap gap-3">
            {nextSlug ? <CtaArrow href={`/entrena/ordena/${nextSlug}`}>Siguiente nivel</CtaArrow> : null}
            <BackToHub />
          </div>
        </div>
      )}
    </div>
  );
}
