"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Check, Flame, X } from "lucide-react";
import { dailyAnswer, dailyGet } from "../actions";
import { BackToHub, Confetti, NewBadges, vibrate } from "../ui";
import type { Daily, DailyAnswer } from "@/lib/entrena/types";

export function Reto() {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [res, setRes] = useState<DailyAnswer | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    dailyGet().then((r) => {
      if (r.error || !r.data) return setError(r.error ?? "Error");
      setDaily(r.data);
      setI(Math.min(r.data.answers.length, r.data.questions.length - 1));
    });
  }, []);

  if (error) return <p className="card p-6 text-ink-muted">{error}</p>;
  if (!daily) return <div className="card p-8 h-72 animate-pulse" />;

  if (daily.finished && !res) {
    return (
      <section className="feed-card p-8 text-center space-y-4">
        <span className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-accent text-on-accent"><Flame size={30} /></span>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Reto hecho. <span className="em">Vuelve mañana.</span></h1>
        <p className="text-ink-muted">{daily.hits} de {daily.questions.length} aciertos · {daily.streak} {daily.streak === 1 ? "día" : "días"} de racha</p>
        <div className="flex justify-center"><BackToHub /></div>
      </section>
    );
  }

  const q = daily.questions[i];
  const finished = res?.finished;

  function answer(k: number) {
    if (picked !== null || pending) return;
    setPicked(k);
    start(async () => {
      const r = await dailyAnswer(k);
      if (r.error || !r.data) { setPicked(null); setError(r.error ?? "Error"); return; }
      setRes(r.data);
      vibrate(r.data.ok ? 20 : [30, 40, 30]);
    });
  }

  if (finished && res && picked === -99) {
    return (
      <div className="space-y-4">
        <Confetti />
        <section className="rounded-[24px] bg-bg-dark on-dark text-[#f5f4ef] p-8 text-center space-y-4">
          <span className="pop-in mx-auto grid place-items-center w-20 h-20 rounded-full bg-accent text-on-accent"><Flame size={38} /></span>
          <p className="text-[56px] leading-none font-semibold tabular-nums tracking-[-0.04em]">{res.streak}</p>
          <p className="text-lg">{res.streak === 1 ? "día de racha. " : "días de racha. "}<span className="em">{res.streak === 1 ? "Empieza aquí." : "No la rompas."}</span></p>
          <p className="text-[#a4a8a4]">{res.hits} de {daily.questions.length} aciertos · +{res.xp} XP para la liga</p>
        </section>
        <NewBadges badges={res.badges} />
        <div className="flex justify-center"><BackToHub /></div>
      </div>
    );
  }

  return (
    <section className="card p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2">
        {daily.questions.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < i || (k === i && res) ? "bg-brand" : k === i ? "bg-ink-faint" : "bg-bg-badge"}`} />)}
      </div>
      <p className="label">Reto de hoy · Pregunta {i + 1} de {daily.questions.length}</p>
      <h1 className="text-[22px] sm:text-[26px] leading-tight font-semibold tracking-[-0.03em]">{q.question}</h1>
      <div className="space-y-2.5">
        {q.options.map((o, k) => {
          const isCorrect = res && res.correct === k;
          const isWrong = res && picked === k && !res.ok;
          return (
            <button key={k} type="button" disabled={picked !== null} onClick={() => answer(k)}
              className={`w-full text-left rounded-[16px] border px-5 py-4 text-[15px] transition-colors flex items-center gap-3 ${isCorrect ? "border-brand bg-brand-soft" : isWrong ? "border-red-700/50 bg-red-700/10 shake" : picked === k ? "border-ink-faint" : "border-line hover:border-ink-faint"}`}>
              <span className="flex-1">{o}</span>
              {isCorrect && <Check size={18} className="text-brand shrink-0" />}
              {isWrong && <X size={18} className="text-red-700 shrink-0" />}
            </button>
          );
        })}
      </div>
      {res && (
        <div className="pop-in space-y-4">
          {res.explanation && <p className="text-[15px] text-ink-muted"><b className="text-ink">{res.ok ? "Bien visto. " : "No era esa. "}</b>{res.explanation}</p>}
          <button type="button" className="btn btn-dark" onClick={() => {
            if (res.finished) { setPicked(-99); return; }
            setI(i + 1); setPicked(null); setRes(null);
          }}>{res.finished ? "Ver mi racha" : "Siguiente"} <ArrowRight size={15} /></button>
        </div>
      )}
    </section>
  );
}
