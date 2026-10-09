"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadMedia } from "./extra-actions";

/** Campo de imagen: sube al almacenamiento del equipo y guarda la URL en un input oculto. */
export function ImageField({ name, label, defaultValue, round = false }: { name: string; label: string; defaultValue?: string | null; round?: boolean }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium block">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url ? (
          <span className="relative">
            <img src={url} alt="" className={`object-cover border border-line ${round ? "w-16 h-16 rounded-full" : "w-28 h-16 rounded-[10px]"}`} />
            <button type="button" onClick={() => setUrl("")} className="absolute -top-2 -right-2 grid place-items-center w-6 h-6 rounded-full bg-ink text-bg" aria-label="Quitar imagen"><X size={12} /></button>
          </span>
        ) : null}
        <button type="button" className="btn btn-ghost !py-2" disabled={pending} onClick={() => input.current?.click()}>
          <ImagePlus size={15} /> {pending ? "Subiendo…" : url ? "Cambiar" : "Subir imagen"}
        </button>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const fd = new FormData();
          fd.set("file", f);
          start(async () => {
            const r = await uploadMedia(fd);
            if (r.error) setError(r.error); else { setError(null); setUrl(r.url!); }
          });
        }}
      />
    </div>
  );
}
