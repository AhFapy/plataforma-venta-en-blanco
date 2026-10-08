import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";

export default async function CommunityIndex() {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("channels").select("slug").order("position").limit(2);
  // Por defecto, el primer canal donde los alumnos pueden hablar (después de Anuncios)
  const slug = data?.[1]?.slug ?? data?.[0]?.slug;
  if (!slug) return <p className="text-ink-muted">No hay canales.</p>;
  redirect(`/comunidad/${slug}`);
}
