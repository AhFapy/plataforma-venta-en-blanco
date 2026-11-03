"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Phone, RotateCcw } from "lucide-react";
import { simChoose, simStart } from "../../actions";
import { BackToHub, Confetti, CtaArrow, NewBadges, vibrate } from "../../ui";
import type { SimChoice, SimEnding, SimNode, SimStep } from "@/lib/entrena/types";

type Scenario = { slug: string; title: string; persona: string; role: string; context: string | null; offer: string | null };
type Line = { who: "lead" | "me"; text: string; d?: number; fb?: string };

const RESULT: Record<string, string> = { cierre: "Venta cerrada", agenda: "Llamada agendada", integridad: "Decisión íntegra", seguimiento: "Se queda en seguimiento", perdida: "Lead perdido", venta_mala: "Venta que no debías hacer" };

export function Sim({ scenario }: { scenario: Scenario }) {
  const [run, setRun] = useState<string | null>(null);
  const [trust, setTrust] = useState(50);
  const [node, setNode] = useState<SimNode | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [last, setLast] = useState<SimChoice | null>(null);
  const [ending, setEnding] = useState<SimEnding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { if (run) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [lines, last, run]);

  const begin = () => start(async () => {
    setError(null);
    const r = await simStart(scenario.slug);
    if (r.error || !r.data) return setError(r.error ?? "Error");
    setRun(r.data.run); setTrust(r.data.trust); setNode(r.data.node);
    setLines([{ who: "lead", text: r.data.node.lead }]); setLast(null); setEnding(null);
  });

  function choose(k: number) {
    if (!run || !node || last) return;
    const text = node.options[k];
    start(async () => {
      const r = await simChoose(run, k);
      if (r.error || !r.data) return setError(r.error ?? "Error");
      setLines((l) => [...l, { who: "me", text, d: r.data!.d, fb: r.data!.fb }]);
      setTrust(r.data.trust); setLast(r.data);
      vibrate(r.data.d >= 0 ? 15 : [30, 40, 30]);
    });
  }

  function advance() {
    if (!last) return;
    if (last.done) { setEnding(last.ending); return; }
    const n = last.next!;
    setNode(n); setLines((l) => [...l, { who: "lead", text: n.lead }]); setLast(null);
  }

  if (!run) {
    return (
      <section className="feed-card p-7 space-y-5">
        <div className="space-y-2">
          <p className="label">{scenario.role} · {scenario.persona}</p>
          <h1 className="text-[32px] sm:text-[38px] leading-[1.05] font-semibold tracking-[-0.035em]">{scenario.title}</h1>
        </div>
        <div className="space-y-3 text-[15px]">
          {scenario.context && <p><b>El lead.</b> <span className="text-ink-muted">{scenario.context}</span></p>}
          {scenario.offer && <p><b>Lo que vendes.</b> <span className="text-ink-muted">{scenario.offer}</span></p>}
          <p><b>Cómo funciona.</b> <span className="text-ink-muted">Empiezas con 50 de confianza. Cada decisión la sube o la baja. Si cae demasiado, se acabó la llamada.</span></p>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="button" className="btn btn-dark" onClick={begin} disabled={pending}><Phone size={15} /> {pending ? "Llamando…" : "Empezar la llamada"}</button>
      </section>
    );
  }

  if (ending) {
    return (
      <div className="space-y-4">
        {ending.won && <Confetti />}
        <section className={`rounded-[24px] p-7 sm:p-9 space-y-3 ${ending.won ? "bg-bg-dark on-dark text-[#f5f4ef]" : "card"}`}>
          <p className={`text-sm ${ending.won ? "text-[#a4a8a4]" : "text-ink-muted"}`}>{RESULT[ending.result] ?? "Fin de la llamada"} · Confianza {trust} · +{ending.xp} XP</p>
          <h2 className="text-[30px] sm:text-[36px] leading-[1.05] font-semibold tracking-[-0.035em]">{ending.title}</h2>
          <p className="text-[17px]">{ending.body}</p>
          <p className={`pt-2 ${ending.won ? "text-accent" : "text-brand"} font-medium`}>{ending.lesson}</p>
        </section>
        <NewBadges badges={ending.badges} />
        <section className="feed-card p-5 sm:p-6">
          <p className="label mb-4">Tu llamada, decisión a decisión</p>
          <ol className="space-y-4">
            {ending.history.map((h: SimStep, i) => (
              <li key={i} className="space-y-1">
                <p className="text-xs text-ink-faint flex items-center justify-between">{h.stage}<span className={`tabular-nums font-semibold ${h.d >= 0 ? "text-brand" : "text-red-700"}`}>{h.d > 0 ? `+${h.d}` : h.d}</span></p>
                <p className="text-[15px]">{h.chose}</p>
                <p className="text-sm text-ink-muted">{h.fb}</p>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-dark" onClick={begin} disabled={pending}><RotateCcw size={15} /> Repetir</button>
          <CtaArrow href="/entrena/simulador" className="btn btn-ghost">Otra llamada</CtaArrow>
          <BackToHub />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] lg:top-4 z-20 rounded-[16px] border border-line bg-surface/95 backdrop-blur px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium truncate">{scenario.title}</span>
          <span className="text-ink-muted shrink-0 ml-3">Confianza <b className="text-ink tabular-nums">{trust}</b></span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-badge overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${trust < 35 ? "bg-red-700" : "bg-brand"}`} style={{ width: `${trust}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {lines.map((l, i) => (
          l.who === "lead" ? (
            <div key={i} className="fade-in max-w-[88%] rounded-[18px] rounded-bl-[6px] bg-bg-badge px-4 py-3 text-[15px]">{l.text}</div>
          ) : (
            <div key={i} className="fade-in ml-auto max-w-[88%] rounded-[18px] rounded-br-[6px] bg-ink text-bg px-4 py-3 text-[15px]">{l.text}</div>
          )
        ))}
      </div>

      {last ? (
        <div className="pop-in feed-card p-5 space-y-3">
          <p className={`font-semibold tabular-nums ${last.d >= 0 ? "text-brand" : "text-red-700"}`}>{last.d > 0 ? `+${last.d}` : last.d} de confianza</p>
          <p className="text-[15px] text-ink-muted">{last.fb}</p>
          <button type="button" className="btn btn-dark" onClick={advance}>{last.done ? "Ver cómo acaba" : "Seguir la llamada"} <ArrowRight size={15} /></button>
        </div>
      ) : node && (
        <div className="space-y-2.5">
          <p className="label">{node.stage} · ¿Qué dices?</p>
          {node.options.map((o, k) => (
            <button key={k} type="button" disabled={pending} onClick={() => choose(k)} className="w-full text-left rounded-[16px] border border-line bg-surface px-5 py-4 text-[15px] hover:border-brand transition-colors disabled:opacity-60">{o}</button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div ref={bottom} />
    </div>
  );
}
