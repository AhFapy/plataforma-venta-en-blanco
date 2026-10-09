import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { MissionCard } from "@/components/MissionCard";
import { getMissions } from "@/lib/missions";

export const metadata = { title: "Aplicaciones" };

export default async function Apps() {
  const { supabase, profile } = await requireMember();
  const apps = await getMissions(supabase, profile.id, ["apps"]);
  return (
    <div className="fade-in max-w-4xl">
      <PageHeader title="Aplicaciones" emphasis="Trud." />
      <p className="text-ink-muted -mt-4 mb-6 max-w-2xl">Libros, herramientas y productos del ecosistema Trud para seguir avanzando. Algunos suman puntos para tu rango.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {apps.map((m) => <MissionCard key={m.id} m={m} big />)}
      </div>
      {apps.length === 0 && <p className="text-ink-muted">Muy pronto.</p>}
    </div>
  );
}
