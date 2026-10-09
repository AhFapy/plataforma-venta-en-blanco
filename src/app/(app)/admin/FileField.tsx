"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Sube un archivo al bucket privado de recursos y deja ruta y nombre en inputs ocultos. */
export function FileField({ defaultPath, defaultName }: { defaultPath?: string | null; defaultName?: string | null }) {
  const [file, setFile] = useState({ path: defaultPath ?? "", name: defaultName ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium block">Archivo (opcional, en vez de enlace)</span>
      <input type="hidden" name="file_path" value={file.path} />
      <input type="hidden" name="file_name" value={file.name} />
      <div className="flex flex-wrap items-center gap-3">
        {file.path && (
          <span className="inline-flex items-center gap-2 rounded-full bg-bg-badge px-3 py-1.5 text-sm max-w-full">
            <Paperclip size={14} className="shrink-0" /><span className="truncate">{file.name}</span>
            <button type="button" onClick={() => setFile({ path: "", name: "" })} aria-label="Quitar archivo"><X size={13} /></button>
          </span>
        )}
        <button type="button" className="btn btn-ghost !py-2" disabled={busy} onClick={() => input.current?.click()}>
          <Upload size={15} /> {busy ? "Subiendo…" : file.path ? "Cambiar" : "Subir archivo"}
        </button>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
      <input ref={input} type="file" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (f.size > 50 * 1024 * 1024) { setError("Máximo 50 MB"); return; }
        setBusy(true); setError(null);
        const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await createClient().storage.from("recursos").upload(path, f, { contentType: f.type || undefined });
        setBusy(false);
        if (upErr) setError("No se ha podido subir"); else setFile({ path, name: f.name });
      }} />
    </div>
  );
}
