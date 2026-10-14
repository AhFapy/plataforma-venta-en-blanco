"use client";

import { useState, useTransition } from "react";
import { Check, X, MessageCircle } from "lucide-react";
import { decideRequest } from "./actions";

const SITE = "https://plataforma-venta-en-blanco-trud-sales.vercel.app";

export function RequestActions({ id, name, phone }: { id: string; name: string; phone: string | null }) {
  const [state, setState] = useState<"idle" | "aceptada" | "rechazada">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (accept: boolean) => start(async () => {
    setErr(null);
    const r = await decideRequest(id, accept);
    if (r.error) setErr(r.error); else setState(accept ? "aceptada" : "rechazada");
  });

  if (state === "aceptada") {
    const first = name.split(" ")[0];
    const text = `¡Hola ${first}! Ya tienes acceso a la plataforma de Venta en Blanco 💚 Entra aquí con tu email: ${SITE}/login`;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge !bg-brand !text-white">Aceptada</span>
        {phone && (
          <a className="btn btn-brand !py-2" target="_blank" rel="noreferrer" href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`}>
            <MessageCircle size={15} /> Avisar por WhatsApp
          </a>
        )}
      </div>
    );
  }
  if (state === "rechazada") return <span className="badge">Rechazada</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={pending} onClick={() => go(true)} className="btn btn-brand !py-2"><Check size={15} /> Aceptar</button>
      <button disabled={pending} onClick={() => go(false)} className="btn btn-ghost !py-2"><X size={15} /> Rechazar</button>
      {err && <span className="text-sm text-red-700">{err}</span>}
    </div>
  );
}
