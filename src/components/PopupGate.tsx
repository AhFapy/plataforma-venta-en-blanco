"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { markPopupSeen } from "@/app/popup-actions";

type Popup = { id: string; title: string; body: string | null; image_url: string | null; cta_label: string | null; link: string | null };

export function PopupGate({ popup }: { popup: Popup }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Pequeño retraso para que no tape la página nada más cargar
  useEffect(() => { const t = setTimeout(() => setOpen(true), 900); return () => clearTimeout(t); }, []);

  function close(clicked: boolean) {
    setOpen(false);
    markPopupSeen(popup.id, clicked);
    if (clicked && popup.link) {
      if (/^https?:\/\//.test(popup.link)) window.open(popup.link, "_blank", "noopener");
      else router.push(popup.link);
    }
  }

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 backdrop-blur-sm p-4 fade-in" role="dialog" aria-modal="true" aria-label={popup.title}>
      <div className="relative w-full max-w-md feed-card overflow-hidden shadow-2xl">
        <button onClick={() => close(false)} className="absolute top-3 right-3 z-10 grid place-items-center w-9 h-9 rounded-full bg-black/30 text-white hover:bg-black/50" aria-label="Cerrar">
          <X size={18} />
        </button>
        {popup.image_url && <img src={popup.image_url} alt="" className="w-full aspect-[16/10] object-cover" />}
        <div className="p-6 space-y-3">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] leading-tight">{popup.title}</h2>
          {popup.body && <p className="text-ink-muted whitespace-pre-line">{popup.body}</p>}
          <div className="flex gap-2 pt-2">
            {popup.link && (
              <button onClick={() => close(true)} className="btn btn-brand flex-1 justify-center">
                {popup.cta_label || "Ver"} <ArrowRight size={16} />
              </button>
            )}
            <button onClick={() => close(false)} className={`btn btn-ghost ${popup.link ? "" : "flex-1 justify-center"}`}>
              {popup.link ? "Ahora no" : "Entendido"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
