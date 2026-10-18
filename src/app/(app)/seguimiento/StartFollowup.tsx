"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startFollowup } from "./actions";

export function StartFollowup({ students }: { students: { id: string; name: string }[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!students.length) return null;
  return (
    <details className="card p-5">
      <summary className="cursor-pointer text-sm font-medium">Añadir al seguimiento a un alumno que ya estaba</summary>
      <form
        className="mt-4 flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => { const r = await startFollowup(fd); setMsg(r.error ?? "Añadido"); if (r.ok) router.refresh(); });
        }}
      >
        <select name="user_id" required className="input flex-1" defaultValue="">
          <option value="" disabled>Elige alumno…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-muted">Inicio <input name="start_date" type="date" required className="input" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <button disabled={pending} className="btn btn-dark !py-2">Añadir</button>
      </form>
      {msg && <p className="mt-2 text-sm text-ink-muted">{msg}</p>}
    </details>
  );
}
