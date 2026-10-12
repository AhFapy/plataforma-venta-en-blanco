import Link from "next/link";
import { Search } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Miembros" };

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase } = await requireMember();
  let query = supabase.from("profiles").select("id,full_name,avatar_url,role,cohort,bio").eq("active", true).not("onboarded_at", "is", null).order("full_name").limit(300);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;

  return (
    <div className="fade-in">
      <PageHeader label="Miembros" title="La" emphasis="comunidad.">
        <form className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre" className="input !pl-10" />
        </form>
      </PageHeader>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(data ?? []).map((m) => (
          <Link key={m.id} href={`/miembros/${m.id}`} className="card p-5 flex gap-4 hover:border-brand transition-colors">
            <Avatar name={m.full_name} url={m.avatar_url} size={48} />
            <div className="min-w-0">
              <p className="font-medium truncate flex items-center gap-2">
                {m.full_name}
                {m.role !== "alumno" && <span className="badge !py-0.5 !text-[10px] !bg-brand !text-white">Equipo</span>}
              </p>
              {m.cohort && <p className="text-xs text-ink-faint">{m.cohort}</p>}
              {m.bio && <p className="text-sm text-ink-muted line-clamp-2 mt-1">{m.bio}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
