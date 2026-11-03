import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import type { OrderLevel } from "@/lib/entrena/types";
import { Order } from "./Order";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("order_get", { p_slug: slug });
  if (error || !data) notFound();
  const { data: levels } = await supabase.from("game_order_levels").select("slug").eq("active", true).order("position");
  const list = (levels ?? []).map((l) => l.slug as string);
  const nextSlug = list[list.indexOf(slug) + 1] ?? null;
  const level = data as OrderLevel;
  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/entrena/ordena" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft size={14} /> Todos los niveles</Link>
      <header className="space-y-1">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.03em]">{level.title}</h1>
        <p className="text-ink-muted">{level.intro}</p>
      </header>
      <Order key={slug} level={level} nextSlug={nextSlug} />
    </div>
  );
}
