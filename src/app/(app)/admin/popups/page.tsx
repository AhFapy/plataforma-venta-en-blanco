import { requireStaff } from "@/lib/auth";
import type { Popup } from "@/lib/popups";
import { fmtDateTime } from "@/lib/utils";
import { ActionForm, DeleteButton, Field } from "../ActionForm";
import { ImageField } from "../ImageField";
import { deletePopup, savePopup } from "../extra-actions";
import { toLocalMadrid } from "../fields";

export const metadata = { title: "Pop-ups" };

function PopupFields({ p }: { p?: Popup }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-2"><Field label="Título"><input name="title" className="input" defaultValue={p?.title} required placeholder="Entradas para el Sales Summit" /></Field></div>
      <div className="sm:col-span-2"><Field label="Texto"><textarea name="body" className="input min-h-20" defaultValue={p?.body ?? ""} /></Field></div>
      <Field label="Texto del botón"><input name="cta_label" className="input" defaultValue={p?.cta_label ?? ""} placeholder="Ver más" /></Field>
      <Field label="Enlace del botón" hint="Ruta de la plataforma (/eventos) o URL completa. Vacío = solo botón de cerrar"><input name="link" className="input" defaultValue={p?.link ?? ""} /></Field>
      <Field label="Se muestra desde (hora España)"><input name="starts_at" type="datetime-local" className="input" defaultValue={toLocalMadrid(p?.starts_at)} /></Field>
      <Field label="Hasta (opcional)"><input name="ends_at" type="datetime-local" className="input" defaultValue={toLocalMadrid(p?.ends_at)} /></Field>
      <ImageField name="image_url" label="Imagen (opcional)" defaultValue={p?.image_url} />
      <label className="flex items-center gap-2 text-sm self-end pb-3"><input type="checkbox" name="active" defaultChecked={p ? p.active : true} /> Activo</label>
    </div>
  );
}

function status(p: Popup) {
  const now = Date.now();
  if (!p.active) return { label: "Pausado", cls: "" };
  if (new Date(p.starts_at).getTime() > now) return { label: "Programado", cls: "!bg-accent-soft !text-brand-deep" };
  if (p.ends_at && new Date(p.ends_at).getTime() <= now) return { label: "Terminado", cls: "" };
  return { label: "Activo ahora", cls: "!bg-brand !text-white" };
}

export default async function AdminPopups() {
  const { supabase } = await requireStaff();
  const [{ data }, { data: views }] = await Promise.all([
    supabase.from("popups").select("*").order("starts_at", { ascending: false }),
    supabase.from("popup_views").select("popup_id,clicked").limit(50000),
  ]);
  const stats = new Map<string, { seen: number; clicks: number }>();
  for (const v of views ?? []) {
    const st = stats.get(v.popup_id) ?? { seen: 0, clicks: 0 };
    st.seen++; if (v.clicked) st.clicks++;
    stats.set(v.popup_id, st);
  }
  const popups = (data ?? []) as Popup[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Pop-ups</h1>
        <p className="text-ink-muted mt-1 max-w-2xl">Ventanas que salen al alumno al entrar, entre las fechas que elijas. Cada alumno ve cada pop-up una sola vez. Si coinciden varios, salen de uno en uno por orden de fecha.</p>
      </div>

      <section className="card p-6">
        <p className="label mb-4">Programar pop-up</p>
        <ActionForm action={savePopup} submit="Programar" resetOnOk><PopupFields /></ActionForm>
      </section>

      <div className="space-y-3">
        {popups.map((p) => {
          const st = status(p);
          const s = stats.get(p.id) ?? { seen: 0, clicks: 0 };
          return (
            <details key={p.id} className="card p-5">
              <summary className="cursor-pointer flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{p.title}</span>
                <span className={`badge ${st.cls}`}>{st.label}</span>
                <span className="text-sm text-ink-muted capitalize">{fmtDateTime(p.starts_at)}{p.ends_at ? ` → ${fmtDateTime(p.ends_at)}` : ""}</span>
                <span className="text-sm text-ink-faint">{s.seen} vistos · {s.clicks} clics</span>
              </summary>
              <div className="mt-5 space-y-4">
                <ActionForm action={savePopup}><PopupFields p={p} /></ActionForm>
                <DeleteButton onDelete={deletePopup.bind(null, p.id)} label="Borrar pop-up" />
              </div>
            </details>
          );
        })}
        {popups.length === 0 && <p className="text-ink-muted">Aún no hay pop-ups.</p>}
      </div>
    </div>
  );
}
