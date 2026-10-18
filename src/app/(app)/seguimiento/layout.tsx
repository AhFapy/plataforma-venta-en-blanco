import Link from "next/link";
import { requireCsm } from "@/lib/auth";

export default async function FollowupLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireCsm();
  const { count } = await supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("status", "enviado");
  return (
    <div className="fade-in">
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/seguimiento" className="rounded-full px-4 py-2 text-sm bg-bg-badge text-ink-muted hover:text-ink">Alumnos</Link>
        <Link href="/seguimiento/testimonios" className="rounded-full px-4 py-2 text-sm bg-bg-badge text-ink-muted hover:text-ink inline-flex items-center gap-1.5">
          Testimonios
          {(count ?? 0) > 0 && <span className="rounded-full bg-brand text-white text-[11px] leading-none px-1.5 py-1 tabular-nums">{count}</span>}
        </Link>
      </div>
      {children}
    </div>
  );
}
