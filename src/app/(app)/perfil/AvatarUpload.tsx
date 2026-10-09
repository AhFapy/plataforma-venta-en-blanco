"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, ZoomIn } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { saveAvatar } from "@/app/profile-actions";

/** Recorta la imagen al área elegida y la devuelve como JPG cuadrado de 640 px. */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const size = 640;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.88));
}

export function AvatarUpload({ name, url, required = false }: { name: string | null; url: string | null; required?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  function save() {
    if (!src || !area) return;
    start(async () => {
      const blob = await cropToBlob(src, area);
      const fd = new FormData();
      fd.set("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await saveAvatar(fd);
      setError(res.error ?? null);
      if (!res.error) { setSrc(null); router.refresh(); }
    });
  }

  return (
    <div className="flex items-center gap-5">
      <button type="button" onClick={() => input.current?.click()} className={`relative rounded-full ${required && !url ? "ring-2 ring-brand ring-offset-2 ring-offset-bg" : ""}`} aria-label="Cambiar foto">
        <Avatar name={name} url={url} size={80} />
        <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-7 h-7 rounded-full bg-brand text-white ring-[3px] ring-bg"><Camera size={14} /></span>
      </button>
      <div>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => input.current?.click()}>
          <Camera size={16} /> {url ? "Cambiar foto" : "Subir foto"}
        </button>
        {required && !url && <p className="text-sm text-ink-muted mt-2">Obligatoria. Que se te vea la cara.</p>}
        {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 15 * 1024 * 1024) { setError("Imagen demasiado grande (máx. 15 MB)."); return; }
          setError(null); setZoom(1); setCrop({ x: 0, y: 0 });
          setSrc(URL.createObjectURL(f));
        }}
      />

      {src && createPortal(
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4 fade-in" role="dialog" aria-modal="true" aria-label="Recortar foto">
          <div className="w-full max-w-md feed-card overflow-hidden">
            <div className="relative h-[min(70vw,380px)] bg-black">
              <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} />
            </div>
            <div className="p-5 space-y-4">
              <label className="flex items-center gap-3 text-sm text-ink-muted">
                <ZoomIn size={16} />
                <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brand)]" aria-label="Zoom" />
              </label>
              <p className="text-xs text-ink-faint">Arrastra para encuadrar y usa el zoom para ajustar.</p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-brand flex-1 justify-center" onClick={save} disabled={pending}>{pending ? "Guardando…" : "Guardar foto"}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setSrc(null)} disabled={pending}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
