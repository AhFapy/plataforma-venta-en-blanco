"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveSubmission } from "@/app/(app)/hoja-en-blanco/actions";
import { timeAgo } from "@/lib/utils";

const MAX = 25 * 1024 * 1024;

export type MySubmission = {
  body: string | null; file_name: string | null; file_url: string | null;
  feedback: string | null; feedback_at: string | null; updated_at: string;
} | null;

/** Caja "Tu deber" al final de cada clase: texto y/o archivo. Se puede editar después de entregar. */
export function HomeworkBox({ lessonId, userId, sub }: { lessonId: string; userId: string; sub: MySubmission }) {
  const [editing, setEditing] = useState(!sub);
  const [body, setBody] = useState(sub?.body ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const keptFile = !file && !removeFile && sub?.file_name;

  async function submit() {
    setError(null);
    if (!body.trim() && !file && !keptFile) { setError("Escribe tu respuesta o adjunta un archivo."); return; }
    setBusy(true);
    let uploaded: { path: string; name: string } | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
      const path = `${userId}/${lessonId}/${Date.now()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("deberes").upload(path, file, { contentType: file.type || undefined });
      if (upErr) { setBusy(false); setError("No se ha podido subir el archivo. Máximo 25 MB."); return; }
      uploaded = { path, name: file.name };
    }
    start(async () => {
      const r = await saveSubmission(lessonId, body, uploaded, removeFile);
      setBusy(false);
      if (r.error) { setError(r.error); return; }
      setFile(null); setRemoveFile(false); setEditing(false);
      router.refresh();
    });
  }

  return (
    <section className="card p-6 space-y-4" id="deber">
      <div className="flex items-center justify-between gap-3">
        <p className="label">Tu deber de esta clase</p>
        {sub && !editing && <span className="flex items-center gap-1.5 text-sm text-brand"><CheckCircle2 size={15} /> Entregado {timeAgo(sub.updated_at)}</span>}
      </div>

      {!editing && sub ? (
        <div className="space-y-4">
          {sub.body && <p className="whitespace-pre-line text-[15px] leading-relaxed break-words">{sub.body}</p>}
          {sub.file_url && (
            <a href={sub.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-bg-badge px-3 py-1.5 text-sm hover:text-brand">
              <Paperclip size={14} /> {sub.file_name}
            </a>
          )}
          {sub.feedback && (
            <div className="rounded-[16px] bg-accent-soft p-4 space-y-1">
              <p className="text-sm font-semibold text-brand-deep">Corrección del equipo</p>
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{sub.feedback}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-ghost !py-2" onClick={() => setEditing(true)}>Editar entrega</button>
            <Link href="/hoja-en-blanco" className="btn btn-ghost !py-2">Ver todos mis deberes</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={20000}
            className="input min-h-[120px] resize-y" placeholder="Escribe aquí tu respuesta al ejercicio de la clase…" />
          <input ref={input} type="file" hidden onChange={(e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            if (f.size > MAX) { setError("Máximo 25 MB."); return; }
            setError(null); setFile(f); setRemoveFile(false);
          }} />
          <div className="flex flex-wrap items-center gap-2">
            {file || keptFile ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-bg-badge px-3 py-1.5 text-sm max-w-full">
                <Paperclip size={14} className="shrink-0" /><span className="truncate">{file?.name ?? sub?.file_name}</span>
                <button onClick={() => { if (file) setFile(null); else setRemoveFile(true); }} aria-label="Quitar archivo" className="text-ink-faint hover:text-ink"><X size={14} /></button>
              </span>
            ) : (
              <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <Paperclip size={15} /> Adjuntar archivo (PDF, audio, imagen…)
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button className="btn btn-dark !py-2" disabled={busy} onClick={submit}>{busy ? "Entregando…" : sub ? "Guardar cambios" : "Entregar deber"}</button>
            {sub && <button className="btn btn-ghost !py-2" disabled={busy} onClick={() => { setEditing(false); setBody(sub.body ?? ""); setFile(null); setRemoveFile(false); setError(null); }}>Cancelar</button>}
          </div>
        </div>
      )}
    </section>
  );
}
