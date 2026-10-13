"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Filtra en el navegador los elementos [data-search] dentro de los hijos.
// Los grupos [data-search-group] se ocultan si no les queda nada visible (o si su propio título no coincide).
export function SearchFilter({ placeholder = "Buscar…", children }: { placeholder?: string; children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [empty, setEmpty] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const match = (t: string) => terms.every((w) => t.includes(w));
    let any = false;
    root.querySelectorAll<HTMLElement>("[data-search-group]").forEach((g) => {
      const groupHit = terms.length > 0 && match(norm(g.dataset.searchGroup ?? ""));
      let visible = 0;
      g.querySelectorAll<HTMLElement>("[data-search]").forEach((el) => {
        const show = !terms.length || groupHit || match(norm(el.dataset.search ?? ""));
        el.hidden = !show;
        if (show) visible++;
      });
      const showGroup = !terms.length || groupHit || visible > 0;
      g.hidden = !showGroup;
      g.querySelectorAll<HTMLElement>("[data-search-hide]").forEach((el) => { el.hidden = terms.length > 0; });
      if (showGroup) any = true;
    });
    setEmpty(terms.length > 0 && !any);
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="input w-full !pl-11 !pr-10"
          aria-label="Buscar"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted" aria-label="Borrar">
            <X size={16} />
          </button>
        )}
      </div>
      <div ref={ref} className="space-y-4">{children}</div>
      {empty && <p className="text-sm text-ink-muted text-center py-6">Nada coincide con «{q}».</p>}
    </div>
  );
}
