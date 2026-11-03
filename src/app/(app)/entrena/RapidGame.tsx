"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X, Zap } from "lucide-react";
import { gameAnswer, gameStart, gameTick } from "./actions";
import { BackToHub, Confetti, Lives, NewBadges, vibrate } from "./ui";
import type { RapidAnswer, RapidItem, RapidSummary } from "@/lib/entrena/types";

type Config = { game: "ping_pong" | "lee"; title: string; emphasis: string; intro: string; rules: string[]; quote?: boolean };

export function RapidGame({ cfg, best }: { cfg: Config; best: number | null }) {
  const [session, setSession] = useState<string | null>(null);
  const [item, setItem] = useState<RapidItem | null>(null);
  const [total, setTotal] = useState(12);
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [res, setRes] = useState<RapidAnswer | null>(null);
  const [summary, setSummary] = useState<RapidSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [pending, start] = useTransition();
  const answering = useRef(false);

  const begin = () => start(async () => {
    setError(null);
    const r = await gameStart(cfg.game);
    if (r.error || !r.data) return setError(r.error ?? "Error");
    setSession(r.data.session); setItem(r.data.item); setTotal(r.data.total); setLives(r.data.lives);
    setIdx(0); setScore(0); setCombo(0); setPicked(null); setRes(null); setSummary(null); answering.current = false;
    setLeft(r.data.item.limit);
  });

  const answer = useCallback((k: number) => {
    if (!session || answering.current) return;
    answering.current = true;
    setPicked(k);
    start(async () => {
      const r = await gameAnswer(session, k);
      if (r.error || !r.data) { setError(r.error ?? "Error"); return; }
      setRes(r.data); setLives(r.data.lives); setScore(r.data.score); setCombo(r.data.combo);
      vibrate(r.data.ok ? 20 : [30, 40, 30]);
    });
  }, [session]);

  // Reloj visual. El que manda de verdad es el del servidor.
  useEffect(() => {
    if (!item || res || summary) return;
    const startAt = Date.now();
    const t = setInterval(() => {
      const rest = item.limit - (Date.now() - startAt) / 1000;
      setLeft(rest);
      if (rest <= 0) { clearInterval(t); answer(-1); }
    }, 100);
    return () => clearInterval(t);
  }, [item, res, summary, answer]);

  function next() {
    if (!res || !session) return;
    if (res.done) { setSummary(res.summary); return; }
    const n = res.next;
    start(async () => {
      await gameTick(session);
      setItem(n); setIdx(res.idx); setPicked(null); setRes(null); setLeft(n?.limit ?? 0); answering.current = false;
    });
  }

  if (summary) {
    const record = best === null || summary.score > best;
    return (
      <div className="max-w-2xl space-y-4">
        {record && summary.score > 0 && <Confetti />}
        <section className="rounded-[24px] bg-bg-dark on-dark text-[#f5f4ef] p-8 space-y-4">
          <p className="text-sm text-[#a4a8a4]">{record && summary.score > 0 ? "Nuevo récord" : "Fin de la partida"}</p>
          <p className="text-[64px] leading-none font-semibold tabular-nums tracking-[-0.04em]">{summary.score}</p>
          <p className="text-[#a4a8a4]">{summary.hits} de {summary.total} aciertos · mejor racha {summary.best_combo} · {summary.xp} XP hoy para la liga</p>
        </section>
        <NewBadges badges={summary.badges} />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-dark" onClick={begin} disabled={pending}><RotateCcw size={15} /> Otra partida</button>
          <BackToHub />
        </div>
        <p className="text-xs text-ink-faint">Para la liga cuenta tu mejor partida de cada día, hasta 150 XP.</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl space-y-5">
        <Link href="/entrena" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Entrena</Link>
        <section className="feed-card p-7 space-y-5">
          <h1 className="text-[32px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">{cfg.title} <span className="em">{cfg.emphasis}</span></h1>
          <p className="text-ink-muted text-[17px]">{cfg.intro}</p>
          <ul className="space-y-2 text-[15px]">
            {cfg.rules.map((r) => <li key={r} className="flex gap-2.5"><Check size={17} className="text-brand shrink-0 mt-0.5" /> {r}</li>)}
          </ul>
          {best !== null && <p className="text-sm text-ink-muted">Tu récord: <b className="text-ink tabular-nums">{best}</b></p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="button" className="btn btn-dark" onClick={begin} disabled={pending}>{pending ? "Preparando…" : "Empezar"} <ArrowRight size={15} /></button>
        </section>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(1, left / item.limit));
  const urgent = pct < 0.3 && !res;
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Lives lives={lives} />
        <span className="text-sm text-ink-muted tabular-nums">{Math.min(idx + 1, total)} / {total}</span>
        <span className="flex items-center gap-2">
          {combo >= 2 && <span key={combo} className="pop-in badge !bg-accent !text-on-accent font-semibold"><Zap size={12} /> x{combo}</span>}
          <span className="font-semibold tabular-nums text-lg">{score}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-badge overflow-hidden">
        <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-red-700" : "bg-brand"}`} style={{ width: `${(res ? 0 : pct) * 100}%` }} />
      </div>

      <section key={item.id} className={`card p-6 sm:p-8 space-y-5 ${res && !res.ok ? "shake" : ""}`}>
        {item.tag && <p className="label">{item.tag}</p>}
        <h1 className={`leading-tight font-semibold tracking-[-0.03em] ${cfg.quote ? "text-[28px] sm:text-[34px]" : "text-[22px] sm:text-[26px]"}`}>{item.prompt}</h1>
        <div className={item.options.length > 3 ? "grid grid-cols-2 gap-2.5" : "space-y-2.5"}>
          {item.options.map((o, k) => {
            const isCorrect = res && res.correct === k;
            const isWrong = res && picked === k && !res.ok;
            return (
              <button key={k} type="button" disabled={picked !== null} onClick={() => answer(k)}
                className={`w-full text-left rounded-[16px] border px-5 py-4 text-[15px] transition-colors flex items-center gap-3 ${isCorrect ? "border-brand bg-brand-soft" : isWrong ? "border-red-700/50 bg-red-700/10" : "border-line hover:border-ink-faint"}`}>
                <span className="flex-1">{o}</span>
                {isCorrect && <Check size={18} className="text-brand shrink-0" />}
                {isWrong && <X size={18} className="text-red-700 shrink-0" />}
              </button>
            );
          })}
        </div>
        {res && (
          <div className="pop-in space-y-4">
            <p className="text-[15px] text-ink-muted">
              <b className="text-ink">{res.ok ? `+${res.gained}. ` : res.timeout ? "Se acabó el tiempo. " : "No era esa. "}</b>{res.explanation}
            </p>
            <button type="button" autoFocus className="btn btn-dark" onClick={next} disabled={pending}>{res.done ? "Ver resultado" : "Siguiente"} <ArrowRight size={15} /></button>
          </div>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </section>
    </div>
  );
}
