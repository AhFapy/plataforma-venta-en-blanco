"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createStory } from "@/app/story-actions";

const MAX = 30 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];

export function StoryComposer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => { input.current?.click(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = o; };
  }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!TYPES.includes(f.type)) { setError("Sube una foto (JPG, PNG) o un vídeo (MP4, MOV)."); return; }
    if (f.size > MAX) { setError("Máximo 30 MB. Si es un vídeo, recórtalo o súbelo más corto."); return; }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function publish() {
    if (!file) return;
    setBusy(true); setError(null);
    const isVideo = file.type.startsWith("video/");
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await createClient().storage.from("stories").upload(path, file, { contentType: file.type });
    if (upErr) { setBusy(false); setError("No se ha podido subir. Prueba con un archivo más ligero."); return; }
    const res = await createStory(path, isVideo ? "video" : "image", caption);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    onClose();
    router.refresh();
  }

  return createPortal(
    <div className="on-dark fixed inset-0 z-[100] bg-[#111] text-[#f5f4ef] grid place-items-center fade-in" role="dialog" aria-modal="true" aria-label="Nueva historia">
      <input ref={input} type="file" accept={TYPES.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="relative w-screen h-[100dvh] sm:w-auto sm:h-[90vh] sm:aspect-[9/16] sm:rounded-[12px] overflow-hidden bg-black flex flex-col">
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/50 to-transparent">
          <span className="font-semibold pl-1">Nueva historia</span>
          <button onClick={onClose} className="grid place-items-center w-10 h-10 rounded-full hover:bg-white/10" aria-label="Cerrar"><X size={24} /></button>
        </div>

        <div className="flex-1 grid place-items-center">
          {preview ? (
            file?.type.startsWith("video/") ? (
              <video src={preview} autoPlay loop muted playsInline className="w-full h-full object-contain" />
            ) : (
              <img src={preview} alt="" className="w-full h-full object-contain" />
            )
          ) : (
            <button onClick={() => input.current?.click()} className="flex flex-col items-center gap-3 text-white/80 hover:text-white">
              <span className="grid place-items-center w-20 h-20 rounded-full bg-white/10"><ImagePlus size={34} /></span>
              Elige una foto o un vídeo
              <span className="text-xs text-white/50">Se borra sola a las 24 horas</span>
            </button>
          )}
        </div>

        {preview && (
          <div className="absolute bottom-0 inset-x-0 p-4 space-y-3 bg-gradient-to-t from-black/70 to-transparent">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              placeholder="Escribe algo (opcional)"
              className="w-full rounded-full border border-white/40 bg-black/30 px-5 py-3 text-[15px] text-white placeholder:text-white/70 outline-none focus:border-white"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => input.current?.click()} className="btn bg-white/15 text-white" disabled={busy}>Cambiar</button>
              <button onClick={publish} className="btn bg-accent text-on-accent flex-1 justify-center" disabled={busy}>{busy ? "Publicando…" : "Compartir historia"}</button>
            </div>
          </div>
        )}
        {!preview && error && <p className="absolute bottom-6 inset-x-6 text-center text-sm text-red-300">{error}</p>}
      </div>
    </div>,
    document.body
  );
}
