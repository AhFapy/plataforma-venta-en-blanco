"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCsmEvent } from "../actions";

export function NewEvent() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} className="card p-5 flex flex-col sm:flex-row gap-2" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => { const r = await createCsmEvent(fd); setMsg(r.error ?? null); if (r.ok) { ref.current?.reset(); router.refresh(); } });
    }}>
      <input name="title" required className="input flex-1" placeholder="Nombre del evento (ej.: Evento diciembre — Sales Summit)" />
      <input name="event_date" type="date" className="input sm:w-48" />
      <button disabled={pending} className="btn btn-dark !py-2">Crear</button>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
    </form>
  );
}
