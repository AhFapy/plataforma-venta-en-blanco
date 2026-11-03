import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reto } from "./Reto";

export const metadata = { title: "Reto de hoy" };

export default function RetoPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/entrena" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Entrena</Link>
      <Reto />
    </div>
  );
}
