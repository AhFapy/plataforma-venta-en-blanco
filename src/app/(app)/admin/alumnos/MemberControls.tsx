"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { awardPoints, updateMember } from "../actions";

export function MemberControls({ id, active, role, cohort, isAdmin }: { id: string; active: boolean; role: string; cohort: string | null; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    start(async () => { const r = await fn(); setMsg(r.error ?? "Hecho"); router.refresh(); });

  return (
    <div className="relative">
      <button className="p-1.5 rounded-full hover:bg-bg-badge" onClick={() => setOpen(!open)} aria-label="Acciones"><MoreHorizontal size={18} /></button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 card !bg-bg p-3 space-y-2 shadow-lg text-sm">
          <button disabled={pending} className="w-full text-left hover:text-brand" onClick={() => {
            const pts = Number(prompt("Puntos a sumar (negativo para restar)", "25"));
            if (!pts) return;
            const note = prompt("Motivo", "Cliente conseguido") ?? "";
            run(() => awardPoints(id, pts, note));
          }}>Dar puntos</button>
          {isAdmin && (
            <>
              <button disabled={pending} className="w-full text-left hover:text-brand" onClick={() => {
                const v = prompt("Promoción", cohort ?? "");
                if (v !== null) run(() => updateMember(id, { cohort: v.trim() || null }));
              }}>Cambiar promoción</button>
              <div className="flex items-center gap-2">
                <span>Rol</span>
                <select defaultValue={role} disabled={pending} className="input !py-1" onChange={(e) => run(() => updateMember(id, { role: e.target.value as "alumno" | "mentor" | "admin" }))}>
                  <option value="alumno">Alumno</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button disabled={pending} className={`w-full text-left ${active ? "text-red-700" : "text-brand"}`} onClick={() => {
                if (active && !confirm("¿Quitar acceso a esta persona?")) return;
                run(() => updateMember(id, { active: !active }));
              }}>{active ? "Quitar acceso" : "Reactivar acceso"}</button>
            </>
          )}
          {msg && <p className="text-xs text-ink-muted">{msg}</p>}
        </div>
      )}
    </div>
  );
}
