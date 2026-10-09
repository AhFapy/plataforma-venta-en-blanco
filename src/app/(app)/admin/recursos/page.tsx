import { requireStaff } from "@/lib/auth";
import { ActionForm, DeleteButton, Field } from "../ActionForm";
import { FileField } from "../FileField";
import { deleteResource, saveResource } from "../extra-actions";

export const metadata = { title: "Recursos" };

type Res = { id: string; category: string; title: string; description: string | null; url: string | null; file_path: string | null; file_name: string | null; position: number };

function ResourceFields({ r, cats }: { r?: Res; cats: string[] }) {
  return (
    <div className="grid sm:grid-cols-4 gap-4">
      {r && <input type="hidden" name="id" value={r.id} />}
      <div className="sm:col-span-2"><Field label="Título"><input name="title" className="input" defaultValue={r?.title} required placeholder="Guion de cualificación en 5 preguntas" /></Field></div>
      <Field label="Categoría" hint="Agrupa los recursos en la página">
        <input name="category" className="input" list="res-cats" defaultValue={r?.category ?? "General"} />
      </Field>
      <Field label="Orden"><input name="position" type="number" className="input" defaultValue={r?.position ?? 0} /></Field>
      <div className="sm:col-span-4"><Field label="Descripción"><input name="description" className="input" defaultValue={r?.description ?? ""} placeholder="Para qué sirve y cuándo usarlo" /></Field></div>
      <div className="sm:col-span-2"><Field label="Enlace"><input name="url" className="input" defaultValue={r?.url ?? ""} placeholder="https://… (Drive, Notion, vídeo…)" /></Field></div>
      <div className="sm:col-span-2"><FileField defaultPath={r?.file_path} defaultName={r?.file_name} /></div>
      <datalist id="res-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
    </div>
  );
}

export default async function AdminResources() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("library_resources").select("*").order("category").order("position").order("created_at");
  const rows = (data ?? []) as Res[];
  const cats = [...new Set(["General", "Guiones", "Plantillas", "Objeciones", ...rows.map((r) => r.category)])];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Recursos</h1>
        <p className="text-ink-muted mt-1 max-w-2xl">Material de ventas que los alumnos ven en Hoja en Blanco → Recursos. Pon un enlace o sube un archivo (PDF, plantilla, audio). Los archivos son privados: solo los abren alumnos con acceso.</p>
      </div>
      <section className="card p-6">
        <p className="label mb-4">Nuevo recurso</p>
        <ActionForm action={saveResource} submit="Añadir recurso" resetOnOk><ResourceFields cats={cats} /></ActionForm>
      </section>
      <div className="space-y-3">
        {rows.map((r) => (
          <details key={r.id} className="card p-5">
            <summary className="cursor-pointer">
              <span className="font-medium">{r.title}</span>
              <span className="text-sm text-ink-muted ml-3">{r.category} · {r.file_path ? "archivo" : "enlace"}</span>
            </summary>
            <div className="mt-5 space-y-4">
              <ActionForm action={saveResource}><ResourceFields r={r} cats={cats} /></ActionForm>
              <DeleteButton onDelete={deleteResource.bind(null, r.id)} label="Borrar recurso" />
            </div>
          </details>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-faint">Todavía no hay recursos.</p>}
      </div>
    </div>
  );
}
