"use client";

import { useMemo, useState, useTransition } from "react";
import { setAttendance } from "../actions";

export function Attendance({ eventId, people, initial }: { eventId: string; people: { id: string; name: string }[]; initial: string[] }) {
  const [sel, setSel] = useState(new Set(initial));
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = useMemo(() => people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [people, q]);

  return (
    <div className="rounded-[14px] bg-bg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">Asistencia · {sel.size} marcados <span className="text-ink-faint font-normal">(+15 pts cada uno, cuenta para la garantía)</span></p>
        <input className="input !w-56 !py-1.5" placeholder="Filtrar" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-72 overflow-y-auto">
        {shown.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm py-1">
            <input type="checkbox" checked={sel.has(p.id)} onChange={(e) => {
              const n = new Set(sel);
              if (e.target.checked) n.add(p.id); else n.delete(p.id);
              setSel(n);
            }} />
            {p.name}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-dark !py-2" disabled={pending} onClick={() => start(async () => { const r = await setAttendance(eventId, [...sel]); setMsg(r.msg ?? r.error ?? null); })}>
          {pending ? "Guardando…" : "Guardar asistencia"}
        </button>
        {msg && <span className="text-sm text-brand">{msg}</span>}
      </div>
    </div>
  );
}
