"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { loadContent, setOpen } from "./actions";

export function EntrenaAdmin({ open, admin }: { open: boolean; admin: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const load = () => start(async () => {
    setMsg(null);
    const r = await loadContent();
    if (r.error || !r.data) return setMsg(r.error ?? "Error");
    const d = r.data;
    setMsg(`Cargado: ${d.quiz} preguntas, ${d.items} objeciones y situaciones, ${d.order} niveles, ${d.scenarios} llamadas y ${d.badges} insignias.${d.skipped.length ? ` Sin encontrar: ${d.skipped.join(", ")}.` : ""}`);
  });
  const toggle = (v: boolean) => start(async () => {
    setMsg(null); setConfirming(false);
    const r = await setOpen(v);
    if (r.error) setMsg(r.error);
  });

  return (
    <section className={`rounded-[20px] p-6 space-y-4 ${open ? "bg-bg-dark on-dark text-[#f5f4ef]" : "card"}`}>
      <div>
        <p className="font-semibold text-lg">{open ? "Abierto a todos los alumnos" : "Solo lo ve el equipo"}</p>
        <p className={`text-sm mt-1 ${open ? "text-[#a4a8a4]" : "text-ink-muted"}`}>
          {open ? "Cerrarlo oculta Entrena y las preguntas de los quizzes. Los progresos se conservan." : "Los alumnos no ven ni Entrena ni las preguntas de los quizzes hasta que lo abras."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link href="/entrena" className={`btn ${open ? "bg-white/10" : "btn-ghost"}`}>Ver cómo queda</Link>
        {admin && (
          <>
            {!open && (confirming ? (
              <>
                <button type="button" className="btn btn-brand" onClick={() => toggle(true)} disabled={pending}>Sí, abrir a los alumnos</button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancelar</button>
              </>
            ) : (
              <button type="button" className="btn btn-dark" onClick={() => setConfirming(true)}>Abrir a los alumnos</button>
            ))}
            {open && <button type="button" className="btn bg-white/10" onClick={() => toggle(false)} disabled={pending}>Cerrar</button>}
            <button type="button" className={`btn ${open ? "bg-white/10" : "btn-ghost"}`} onClick={load} disabled={pending}>{pending ? "Trabajando…" : "Cargar o actualizar contenido"}</button>
          </>
        )}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </section>
  );
}
