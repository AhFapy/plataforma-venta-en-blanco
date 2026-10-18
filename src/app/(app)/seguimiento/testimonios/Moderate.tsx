"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderateTestimonial } from "../actions";

export function Moderate({ id, status }: { id: string; status: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (a: "publicar" | "devolver" | "despublicar") => start(async () => {
    const r = await moderateTestimonial(id, a, note);
    setMsg(r.error ?? null);
    if (r.ok) router.refresh();
  });
  if (status === "publicado") {
    return <button disabled={pending} onClick={() => go("despublicar")} className="btn btn-ghost !py-2">Quitar de publicados</button>;
  }
  return (
    <div className="space-y-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Nota para el alumno si lo devuelves (opcional)" />
      <div className="flex flex-wrap gap-2">
        <button disabled={pending} onClick={() => go("publicar")} className="btn btn-brand !py-2">Publicar</button>
        <button disabled={pending} onClick={() => go("devolver")} className="btn btn-ghost !py-2">Devolver para editar</button>
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
    </div>
  );
}
