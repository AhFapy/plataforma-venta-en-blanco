"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { submitQuiz, type QuizResult } from "./actions";

type Q = { id: string; question: string; options: string[] };

export function Quiz({ moduleId, questions, backHref }: { moduleId: string; questions: Q[]; backHref: string }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const q = questions[i];
  const last = i === questions.length - 1;

  function send() {
    setError(null);
    start(async () => {
      const r = await submitQuiz(moduleId, answers);
      if (r.error || !r.result) { setError(r.error ?? "Error"); return; }
      setResult(r.result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="space-y-6">
        <section className={`rounded-[24px] p-7 sm:p-9 ${result.passed ? "bg-[#0c1f15] text-[#f5f4ef] on-dark" : "card"}`}>
          <p className={`label ${result.passed ? "!text-[#a4a8a4]" : ""}`}>Resultado</p>
          <p className="mt-2 text-[56px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{result.score}<span className="text-[28px] opacity-60">/{result.total}</span></p>
          <p className="mt-3 text-lg">{result.passed ? <>Aprobado con un {pct} %. <span className="em !text-[#c5ff5b]">Bien hecho.</span></> : <>Un {pct} %. Necesitas un 70 % para aprobar: repasa las que has fallado y vuelve a intentarlo.</>}</p>
          {result.first_pass && <span className="inline-block mt-4 rounded-full bg-accent text-on-accent px-3 py-1 text-sm font-semibold">+20 pts</span>}
        </section>

        <ol className="space-y-3">
          {questions.map((qq, k) => {
            const r = result.results[k];
            return (
              <li key={qq.id} className="card p-5 space-y-2">
                <p className="font-medium flex gap-2">{r?.ok ? <Check size={18} className="text-brand shrink-0 mt-0.5" /> : <X size={18} className="text-red-700 shrink-0 mt-0.5" />}{qq.question}</p>
                {!r?.ok && answers[k] >= 0 && <p className="text-sm text-red-700 pl-6 line-through">{qq.options[answers[k]]}</p>}
                <p className="text-sm pl-6"><span className="text-brand font-medium">{qq.options[r?.correct ?? 0]}</span></p>
                {r?.explanation && <p className="text-sm text-ink-muted pl-6">{r.explanation}</p>}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-3">
          {!result.passed && <button className="btn btn-dark" onClick={() => { setResult(null); setI(0); setAnswers(questions.map(() => -1)); }}><RotateCcw size={15} /> Repetir quiz</button>}
          <Link href={backHref} className={`btn ${result.passed ? "btn-dark" : "btn-ghost"}`}>Seguir con la formación <ArrowRight size={15} /></Link>
        </div>
      </div>
    );
  }

  return (
    <section className="card p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>Pregunta {i + 1} de {questions.length}</span>
        <span className="tabular-nums">{answers.filter((a) => a >= 0).length}/{questions.length} respondidas</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-badge overflow-hidden"><div className="h-full bg-brand transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} /></div>
      <h2 className="text-[22px] sm:text-[26px] leading-tight font-semibold tracking-[-0.03em]">{q.question}</h2>
      <div className="space-y-2.5">
        {q.options.map((o, k) => {
          const sel = answers[i] === k;
          return (
            <button key={k} type="button" onClick={() => setAnswers(answers.map((a, j) => (j === i ? k : a)))}
              className={`w-full text-left rounded-[16px] border px-5 py-4 text-[15px] transition-colors ${sel ? "border-brand bg-brand-soft" : "border-line hover:border-ink-faint"}`}>
              <span className={`inline-grid place-items-center w-6 h-6 mr-3 rounded-full text-xs font-semibold ${sel ? "bg-brand text-white" : "bg-bg-badge text-ink-muted"}`}>{String.fromCharCode(65 + k)}</span>
              {o}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn btn-ghost !py-2" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
        {last ? (
          <button type="button" className="btn btn-dark !py-2" disabled={pending || answers.some((a) => a < 0)} onClick={send}>{pending ? "Corrigiendo…" : "Ver resultado"}</button>
        ) : (
          <button type="button" className="btn btn-dark !py-2" disabled={answers[i] < 0} onClick={() => setI(i + 1)}>Siguiente <ArrowRight size={15} /></button>
        )}
      </div>
    </section>
  );
}
