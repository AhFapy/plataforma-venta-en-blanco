"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Folder as FolderIcon, FolderPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { createFolder, createNote, deleteFolder, deleteNote, renameFolder, saveNote } from "./actions";

export type Folder = { id: string; name: string };
export type Note = { id: string; folder_id: string | null; title: string; body: string; updated_at: string };
type Filter = "all" | "none" | string;
type Patch = { title?: string; body?: string; folder_id?: string | null };

const SAVE_DELAY = 700;

export function NotesBoard({ folders: initialFolders, notes: initialNotes }: { folders: Folder[]; notes: Note[] }) {
  const [folders, setFolders] = useState(initialFolders);
  const [notes, setNotes] = useState(initialNotes);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [blank, setBlank] = useState({ title: "", body: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [mobileEditor, setMobileEditor] = useState(false);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const dirty = useRef(new Map<string, Patch>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const creating = useRef(false);
  const blankRef = useRef(blank);
  blankRef.current = blank;

  const flush = useCallback(async (id: string) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    const patch = dirty.current.get(id);
    if (!patch) return;
    dirty.current.delete(id);
    setStatus("saving");
    const r = await saveNote(id, patch);
    setStatus(r.error ? "error" : "saved");
  }, []);

  const flushAll = useCallback(() => { for (const id of [...dirty.current.keys()]) void flush(id); }, [flush]);

  // Guardar lo pendiente si se cierra o se cambia de pestaña
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flushAll(); };
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty.current.size) { flushAll(); e.preventDefault(); } };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("beforeunload", onUnload); flushAll(); };
  }, [flushAll]);

  function patchNote(id: string, patch: Patch) {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n)));
    dirty.current.set(id, { ...dirty.current.get(id), ...patch });
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.set(id, setTimeout(() => void flush(id), SAVE_DELAY));
    setStatus("saving");
  }

  const currentFolder = filter !== "all" && filter !== "none" ? filter : null;

  /** En la hoja en blanco, la nota se crea al empezar a escribir. */
  async function typeInBlank(patch: { title?: string; body?: string }) {
    setBlank((b) => ({ ...b, ...patch }));
    if (creating.current) return;
    creating.current = true;
    setStatus("saving");
    const r = await createNote(currentFolder);
    creating.current = false;
    if (!r.id) { setStatus("error"); return; }
    const draft = blankRef.current;
    setNotes((ns) => [{ id: r.id!, folder_id: currentFolder, title: draft.title, body: draft.body, updated_at: new Date().toISOString() }, ...ns]);
    setSelectedId(r.id);
    setBlank({ title: "", body: "" });
    patchNote(r.id, { title: draft.title, body: draft.body });
  }

  function select(id: string | null) {
    flushAll();
    setSelectedId(id);
    setMobileEditor(true);
  }

  async function removeNote(id: string) {
    if (!confirm("¿Borrar esta nota? No se puede recuperar.")) return;
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    dirty.current.delete(id);
    const rest = notes.filter((n) => n.id !== id);
    setNotes(rest);
    setSelectedId(null);
    setMobileEditor(false);
    await deleteNote(id);
  }

  async function addFolder() {
    const name = (newFolder ?? "").trim();
    if (!name) { setNewFolder(null); return; }
    const r = await createFolder(name);
    if (r.id) { setFolders((f) => [...f, { id: r.id!, name }]); setFilter(r.id); }
    setNewFolder(null);
  }

  async function submitRename(id: string) {
    const name = (renaming ?? "").trim();
    setRenaming(null);
    if (!name) return;
    setFolders((f) => f.map((x) => (x.id === id ? { ...x, name } : x)));
    await renameFolder(id, name);
  }

  async function removeFolder(id: string) {
    if (!confirm("Se borra la carpeta. Sus notas no se pierden: pasan a «Sin carpeta». ¿Seguir?")) return;
    setFolders((f) => f.filter((x) => x.id !== id));
    setNotes((ns) => ns.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n)));
    setFilter("all");
    await deleteFolder(id);
  }

  const visible = notes
    .filter((n) => filter === "all" || (filter === "none" ? !n.folder_id : n.folder_id === filter))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const count = (f: Filter) => notes.filter((n) => (f === "all" ? true : f === "none" ? !n.folder_id : n.folder_id === f)).length;

  const chip = (f: Filter, label: string) => (
    <button key={f} onClick={() => setFilter(f)}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${filter === f ? "bg-ink text-bg" : "bg-bg-badge text-ink-muted hover:text-ink"}`}>
      {f !== "all" && f !== "none" && <FolderIcon size={13} />}{label}<span className="opacity-60 tabular-nums">{count(f)}</span>
    </button>
  );

  const folderOf = (id: string | null) => folders.find((f) => f.id === id)?.name;

  return (
    <div className="space-y-4">
      {/* Carpetas */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {chip("all", "Todas")}
        {folders.map((f) => chip(f.id, f.name))}
        {notes.some((n) => !n.folder_id) && folders.length > 0 && chip("none", "Sin carpeta")}
        {newFolder === null ? (
          <button onClick={() => setNewFolder("")} className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink whitespace-nowrap">
            <FolderPlus size={14} /> Nueva carpeta
          </button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void addFolder(); }} className="flex items-center gap-1">
            <input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} onBlur={() => void addFolder()} maxLength={60}
              placeholder="Nombre de la carpeta" className="input !py-1.5 !px-3 !text-sm !rounded-full w-48" />
          </form>
        )}
      </div>

      {currentFolder && (
        <div className="flex items-center gap-3 text-sm">
          {renaming !== null ? (
            <form onSubmit={(e) => { e.preventDefault(); void submitRename(currentFolder); }} className="flex items-center gap-2">
              <input autoFocus value={renaming} onChange={(e) => setRenaming(e.target.value)} maxLength={60} className="input !py-1.5 !px-3 !text-sm !rounded-full w-56" />
              <button className="text-brand" aria-label="Guardar nombre"><Check size={16} /></button>
              <button type="button" onClick={() => setRenaming(null)} className="text-ink-faint" aria-label="Cancelar"><X size={16} /></button>
            </form>
          ) : (
            <>
              <button onClick={() => setRenaming(folderOf(currentFolder) ?? "")} className="flex items-center gap-1.5 text-ink-muted hover:text-ink"><Pencil size={13} /> Renombrar carpeta</button>
              <button onClick={() => void removeFolder(currentFolder)} className="flex items-center gap-1.5 text-ink-muted hover:text-red-700"><Trash2 size={13} /> Borrar carpeta</button>
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Lista de notas */}
        <aside className={`space-y-2 ${mobileEditor ? "hidden lg:block" : ""}`}>
          <button onClick={() => select(null)}
            className={`w-full flex items-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-medium ${selectedId === null ? "border-brand text-brand" : "border-dashed border-line text-ink-muted hover:text-ink"}`}>
            <Plus size={16} /> Hoja en blanco
          </button>
          {visible.map((n) => (
            <button key={n.id} onClick={() => select(n.id)}
              className={`w-full text-left rounded-[16px] px-4 py-3 transition-colors ${n.id === selectedId ? "bg-surface border border-brand" : "border border-transparent hover:bg-bg-badge"}`}>
              <p className="font-semibold text-[15px] truncate">{n.title.trim() || "Sin título"}</p>
              <p className="text-sm text-ink-muted line-clamp-2 break-words">{n.body.trim() || "Nota vacía"}</p>
              <p className="text-xs text-ink-faint mt-1">{timeAgo(n.updated_at)}{filter === "all" && folderOf(n.folder_id) ? ` · ${folderOf(n.folder_id)}` : ""}</p>
            </button>
          ))}
          {visible.length === 0 && <p className="text-sm text-ink-faint px-1 py-2">{notes.length ? "No hay notas en esta carpeta." : "Aún no tienes notas."}</p>}
        </aside>

        {/* Hoja */}
        <section className={`feed-card p-5 sm:p-8 min-h-[60vh] flex flex-col gap-4 ${mobileEditor ? "" : "hidden lg:flex"}`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button onClick={() => { flushAll(); setMobileEditor(false); }} className="lg:hidden flex items-center gap-1 text-ink-muted"><ArrowLeft size={15} /> Notas</button>
            <label className="flex items-center gap-2 text-ink-muted min-w-0">
              <FolderIcon size={14} className="shrink-0" />
              <select
                value={selected ? selected.folder_id ?? "" : currentFolder ?? ""}
                disabled={!selected}
                onChange={(e) => selected && patchNote(selected.id, { folder_id: e.target.value || null })}
                className="bg-transparent text-ink outline-none max-w-[180px] truncate disabled:opacity-60"
                aria-label="Guardar en carpeta"
              >
                <option value="">Sin carpeta</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <span className="ml-auto text-xs text-ink-faint">
              {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : status === "error" ? <span className="text-red-700">No se ha guardado</span> : ""}
            </span>
            {selected && <button onClick={() => void removeNote(selected.id)} className="text-ink-faint hover:text-red-700" aria-label="Borrar nota"><Trash2 size={16} /></button>}
          </div>

          <input
            value={selected ? selected.title : blank.title}
            onChange={(e) => (selected ? patchNote(selected.id, { title: e.target.value }) : void typeInBlank({ title: e.target.value }))}
            maxLength={140}
            placeholder="Título"
            className="bg-transparent outline-none text-[26px] sm:text-[32px] font-semibold tracking-[-0.03em] placeholder:text-ink-faint"
          />
          <textarea
            autoFocus={!selected}
            value={selected ? selected.body : blank.body}
            onChange={(e) => (selected ? patchNote(selected.id, { body: e.target.value }) : void typeInBlank({ body: e.target.value }))}
            maxLength={100000}
            placeholder="Escribe lo que quieras: un guion, una objeción que te han puesto, lo que has aprendido hoy…"
            className="flex-1 min-h-[45vh] bg-transparent outline-none resize-none text-[16px] leading-relaxed placeholder:text-ink-faint"
          />
        </section>
      </div>
    </div>
  );
}
