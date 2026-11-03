import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { Sim } from "./Sim";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireMember();
  const { data: s } = await supabase.from("game_scenarios").select("slug,title,persona,role,context,offer").eq("slug", slug).eq("active", true).maybeSingle();
  if (!s) notFound();
  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/entrena/simulador" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Todas las llamadas</Link>
      <Sim scenario={s} />
    </div>
  );
}
