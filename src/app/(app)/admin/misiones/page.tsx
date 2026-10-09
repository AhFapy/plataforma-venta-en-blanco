import { requireStaff } from "@/lib/auth";
import type { Mission } from "@/lib/missions";
import { ActionForm, DeleteButton, Field } from "../ActionForm";
import { ImageField } from "../ImageField";
import { deleteMission, saveMission } from "../extra-actions";

export const metadata = { title: "Misiones" };

function MissionFields({ m }: { m?: Mission }) {
  return (
    <div className="grid sm:grid-cols-4 gap-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="sm:col-span-2"><Field label="Título"><input name="title" className="input" defaultValue={m?.title} required placeholder="Sigue a Javi en Instagram" /></Field></div>
      <Field label="Dónde sale">
        <select name="category" className="input" defaultValue={m?.category ?? "redes"}>
          <option value="redes">Gana puntos (redes)</option>
          <option value="apps">Aplicaciones</option>
          <option value="otros">Gana puntos (otros)</option>
        </select>
      </Field>
      <Field label="Puntos"><input name="points" type="number" min={0} max={1000} className="input" defaultValue={m?.points ?? 20} /></Field>
      <div className="sm:col-span-4"><Field label="Descripción"><input name="description" className="input" defaultValue={m?.description ?? ""} /></Field></div>
      <div className="sm:col-span-2"><Field label="Enlace"><input name="link" className="input" defaultValue={m?.link ?? ""} placeholder="https://…" /></Field></div>
      <Field label="Texto del botón"><input name="cta" className="input" defaultValue={m?.cta ?? ""} placeholder="Ir a Instagram" /></Field>
      <Field label="Orden"><input name="position" type="number" className="input" defaultValue={m?.position ?? 0} /></Field>
      <div className="sm:col-span-3"><ImageField name="image_url" label="Imagen (solo se ve en Aplicaciones)" defaultValue={m?.image_url} /></div>
      <label className="flex items-center gap-2 text-sm self-end pb-3"><input type="checkbox" name="active" defaultChecked={m ? m.active : true} /> Activa</label>
    </div>
  );
}

export default async function AdminMissions() {
  const { supabase } = await requireStaff();
  const [{ data }, { data: comps }] = await Promise.all([
    supabase.from("missions").select("*").order("category").order("position"),
    supabase.from("mission_completions").select("mission_id").limit(20000),
  ]);
  const counts = new Map<string, number>();
  for (const c of comps ?? []) counts.set(c.mission_id, (counts.get(c.mission_id) ?? 0) + 1);
  const missions = (data ?? []) as Mission[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Misiones</h1>
        <p className="text-ink-muted mt-1 max-w-2xl">Acciones que dan puntos: seguir redes, ver el libro, probar una herramienta. Las de redes salen en Ranking → Gana puntos, y las de aplicaciones en Aplicaciones. El alumno tiene que abrir el enlace antes de marcarlas como hechas.</p>
      </div>

      <section className="card p-6">
        <p className="label mb-4">Nueva misión</p>
        <ActionForm action={saveMission} submit="Crear misión" resetOnOk><MissionFields /></ActionForm>
      </section>

      <div className="space-y-3">
        {missions.map((m) => (
          <details key={m.id} className="card p-5">
            <summary className="cursor-pointer">
              <span className="font-medium">{m.title}</span>
              <span className="text-sm text-ink-muted ml-3">{m.category === "apps" ? "Aplicaciones" : "Gana puntos"} · +{m.points} pts · {counts.get(m.id) ?? 0} completadas{m.active ? "" : " · inactiva"}{m.link ? "" : " · sin enlace"}</span>
            </summary>
            <div className="mt-5 space-y-4">
              <ActionForm action={saveMission}><MissionFields m={m} /></ActionForm>
              <DeleteButton onDelete={deleteMission.bind(null, m.id)} label="Borrar misión" confirmText="Se borra la misión. Los puntos ya ganados se mantienen. ¿Seguro?" />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
