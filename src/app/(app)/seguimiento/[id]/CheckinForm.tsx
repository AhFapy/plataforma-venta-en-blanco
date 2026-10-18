"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAGES } from "@/lib/followup";
import { addCheckin } from "../actions";

export function CheckinForm({ userId, suggested }: { userId: string; suggested: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await addCheckin(userId, fd);
          setMsg(r.error ?? "Check-in guardado");
          if (r.ok) { ref.current?.reset(); router.refresh(); }
        });
      }}
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <select name="stage" className="input sm:w-48" defaultValue={suggested}>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="extra">Extra</option>
        </select>
        <input name="checkin_date" type="date" className="input sm:w-48" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <textarea name="notes" required className="input min-h-28" placeholder="Cómo va, qué ha hecho, bloqueos, próximos pasos…" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-brand !py-2">{pending ? "Guardando…" : "Guardar check-in"}</button>
        <span className="text-xs text-ink-faint">Los check-ins no se pueden editar ni borrar después.</span>
      </div>
      {msg && <p className="text-sm text-ink-muted">{msg}</p>}
    </form>
  );
}
