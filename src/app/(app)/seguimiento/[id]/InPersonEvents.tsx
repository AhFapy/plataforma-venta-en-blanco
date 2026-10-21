"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleCsmAttendance } from "../actions";

export function InPersonEvents({ userId, events }: { userId: string; events: { id: string; title: string; event_date: string | null; attended: boolean }[] }) {
  const [state, setState] = useState(() => Object.fromEntries(events.map((e) => [e.id, e.attended])));
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <section className="card p-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="label">Eventos presenciales</p>
        <Link href="/seguimiento/eventos" className="text-sm text-ink-muted hover:text-ink underline">Gestionar eventos</Link>
      </div>
      {events.length === 0 && <p className="text-sm text-ink-muted">Aún no hay eventos. Créalos en «Gestionar eventos».</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {events.map((e) => (
          <label key={e.id} className="flex items-center gap-2 text-[15px]">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--color-brand,#16734b)]"
              checked={!!state[e.id]}
              onChange={(ev) => {
                const v = ev.target.checked;
                setState((s) => ({ ...s, [e.id]: v }));
                start(async () => {
                  const r = await toggleCsmAttendance(e.id, userId, v);
                  if (r.error) { setErr(r.error); setState((s) => ({ ...s, [e.id]: !v })); }
                });
              }}
            />
            {e.title}{e.event_date ? <span className="text-xs text-ink-faint">({new Date(e.event_date + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })})</span> : null}
          </label>
        ))}
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </section>
  );
}
