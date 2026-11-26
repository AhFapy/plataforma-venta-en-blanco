import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Círculo privado" };

const WHATSAPP = "34630160678";
const MENSAJE = "Hola Javi, he visto el vídeo del Círculo Privado y quiero mi Plan 10K. Ahora mismo facturo ___ € al mes.";

export default async function CirculoPrivado() {
  await requireMember();
  const href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`;

  return (
    <div className="fade-in max-w-4xl space-y-6">
      <Link href="/formacion" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Formación
      </Link>

      <div className="aspect-video w-full overflow-hidden rounded-[24px] bg-bg-dark">
        <video src="/circulo-privado.mp4" controls controlsList="nodownload" playsInline preload="metadata" className="h-full w-full" />
      </div>

      <div className="space-y-3">
        <h1 className="text-[28px] sm:text-[36px] leading-[1.1] font-semibold tracking-[-0.03em]">
          Círculo privado: <span className="em">llega a 10.000–20.000 € al mes.</span>
        </h1>
        <p className="text-[16px] leading-relaxed text-ink/85 max-w-2xl">
          Mira el vídeo entero. Si quieres tu Plan 10K, escríbeme por WhatsApp y vemos juntos si encajas.
        </p>
      </div>

      <a href={href} target="_blank" rel="noreferrer" className="btn btn-brand">
        <MessageCircle size={16} /> Quiero mi Plan 10K
      </a>
    </div>
  );
}
