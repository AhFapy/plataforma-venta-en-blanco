"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMyTestimonial } from "./actions";

type Mine = { body: string; kind: string; status: string; review_note: string | null } | null;

export function MyTestimonial({ mine }: { mine: Mine }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (mine?.status === "publicado") {
    return <p className="text-sm text-ink-muted">Tu testimonio está publicado. ¡Gracias por compartirlo! 💚</p>;
  }
  const submit = (fd: FormData) => start(async () => {
    const r = await saveMyTestimonial(fd);
    setMsg(r.error ?? (fd.get("send") === "1" ? "Enviado. El equipo lo revisará y lo publicará." : "Borrador guardado."));
    if (r.ok) router.refresh();
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("send", ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? "0");
        submit(fd);
      }}
    >
      {mine?.status === "enviado" && <p className="text-sm text-brand">Enviado. Está pendiente de revisión; aún puedes editarlo.</p>}
      {mine?.review_note && mine.status === "borrador" && <p className="text-sm rounded-[14px] bg-accent-soft p-3">Nota del equipo: {mine.review_note}</p>}
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" name="kind" value="tangible" defaultChecked={(mine?.kind ?? "tangible") === "tangible"} /> Resultado tangible (facturación, proyectos…)</label>
        <label className="flex items-center gap-2"><input type="radio" name="kind" value="no_tangible" defaultChecked={mine?.kind === "no_tangible"} /> Resultado no tangible (seguridad, habilidades…)</label>
      </div>
      <textarea name="body" required maxLength={4000} defaultValue={mine?.body ?? ""} className="input min-h-40" placeholder="Cuéntanos cómo estabas antes, qué has conseguido y qué ha cambiado en ti." />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} value="1" className="btn btn-brand">Enviar para publicar</button>
        <button disabled={pending} value="0" className="btn btn-ghost">Guardar borrador</button>
        {msg && <span className="text-sm text-ink-muted">{msg}</span>}
      </div>
      <p className="text-xs text-ink-faint">Solo lo verás tú hasta que el equipo lo revise y lo publique.</p>
    </form>
  );
}
