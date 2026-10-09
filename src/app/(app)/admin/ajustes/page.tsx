import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { RosaAvatar } from "@/components/RosaAvatar";
import { ActionForm, Field } from "../ActionForm";
import { ImageField } from "../ImageField";
import { saveSettings } from "../extra-actions";

export const metadata = { title: "Ajustes" };

export default async function AdminSettings() {
  const { supabase } = await requireAdmin();
  const st = await getSettings(supabase);

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Ajustes</h1>
      <ActionForm action={saveSettings} submit="Guardar ajustes" className="space-y-8">
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <RosaAvatar url={st.rosa_avatar_url} size={56} />
            <div>
              <p className="font-semibold">Rosa, la asistente</p>
              <p className="text-sm text-ink-muted">Firma las novedades automáticas y manda los recordatorios cada mañana a las 9:00 (hora España): directos del día y alumnos que llevan 4 días sin entrar.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre"><input name="rosa_name" className="input" defaultValue={st.rosa_name} /></Field>
            <ImageField name="rosa_avatar_url" label="Foto de perfil" defaultValue={st.rosa_avatar_url} round />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <p className="font-semibold">Mentoría con Javi</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Puntos para desbloquearla"><input name="mentoria_points" type="number" min={50} className="input" defaultValue={st.mentoria_points} /></Field>
            <Field label="Enlace para reservar (opcional)" hint="Calendly, WhatsApp… Si está vacío: «el equipo te escribirá»"><input name="mentoria_url" className="input" defaultValue={st.mentoria_url ?? ""} /></Field>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <p className="font-semibold">Trustpilot</p>
          <Field label="Enlace para dejar opinión" hint="Sale al alumno justo después de publicar un resultado, sin puntos a cambio (Trustpilot no permite incentivar reseñas)">
            <input name="trustpilot_url" className="input" defaultValue={st.trustpilot_url ?? ""} />
          </Field>
        </section>
      </ActionForm>
    </div>
  );
}
