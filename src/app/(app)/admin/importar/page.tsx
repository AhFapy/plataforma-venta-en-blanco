"use client";

import { useState } from "react";
import { importCommunity } from "./actions";

export default function ImportarComunidad() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="card p-6 space-y-4 max-w-xl">
      <h1 className="text-xl font-semibold">Importar comunidad de GHL</h1>
      <p className="text-sm text-ink-muted">Sube el archivo vb-comunidad.json. Los posts se crean con el nombre y la foto de su autor original, sin notificar a nadie ni dar puntos. Si lo subes dos veces no duplica nada.</p>
      <input type="file" accept="application/json,.json" disabled={busy} onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        setBusy(true); setMsg("Importando…");
        const r = await importCommunity(await f.text());
        setBusy(false);
        setMsg(r.error ? `Error: ${r.error}` : `Hecho: ${r.posts} posts y ${r.comments} comentarios nuevos.`);
      }} />
      {msg && <p className="text-sm" id="import-result">{msg}</p>}
    </section>
  );
}
