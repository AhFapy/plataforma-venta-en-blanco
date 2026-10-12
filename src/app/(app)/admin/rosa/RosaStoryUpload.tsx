"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { publishRosaStory, rosaStoryUploadUrl } from "./actions";

export function RosaStoryUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function publish() {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) { setMsg("Sube una foto o un vídeo."); return; }
    if (file.size > 30 * 1024 * 1024) { setMsg("Máximo 30 MB."); return; }
    setBusy(true); setMsg(null);
    const u = await rosaStoryUploadUrl(file.name.split(".").pop() || (isVideo ? "mp4" : "jpg"));
    if ("error" in u && u.error) { setBusy(false); setMsg(u.error); return; }
    const { path, token } = u as { path: string; token: string };
    const { error } = await createClient().storage.from("stories").uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (error) { setBusy(false); setMsg("No se ha podido subir el archivo."); return; }
    const r = await publishRosaStory(path, isVideo ? "video" : "image", caption);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    setFile(null); setCaption(""); setMsg("Publicada. Dura 24 horas.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; setMsg(null); }} />
      <button type="button" onClick={() => input.current?.click()} className="btn btn-ghost !py-2"><ImagePlus size={16} /> {file ? file.name : "Elegir foto o vídeo"}</button>
      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className="input" placeholder="Texto encima (opcional)" />
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-dark !py-2" disabled={!file || busy} onClick={publish}>{busy ? "Publicando…" : "Publicar historia como Rosa"}</button>
        {msg && <span className="text-sm text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}
