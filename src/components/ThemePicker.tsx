"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const THEMES = [
  { id: "blanco", label: "Blanco", swatch: "#f5f4ef", ring: "#e2dfd5" },
  { id: "negro", label: "Negro", swatch: "#0a0a0a", ring: "#262626" },
  { id: "verde", label: "Verde", swatch: "#0c1f15", ring: "#1f3a2a" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeId>("blanco");

  useEffect(() => {
    const t = document.documentElement.dataset.theme as ThemeId | undefined;
    setTheme(t ?? "blanco");
  }, []);

  function pick(id: ThemeId) {
    setTheme(id);
    if (id === "blanco") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = id;
    document.cookie = `vb-theme=${id}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className={`flex ${compact ? "gap-1.5" : "gap-3"}`} role="radiogroup" aria-label="Color de la plataforma">
      {THEMES.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={theme === t.id}
          onClick={() => pick(t.id)}
          title={t.label}
          className={compact ? "grid place-items-center w-7 h-7 rounded-full border-2 transition-transform hover:scale-110" : "flex items-center gap-2.5 rounded-full border border-line pl-1.5 pr-4 py-1.5 text-sm hover:border-brand"}
          style={compact ? { background: t.swatch, borderColor: theme === t.id ? "var(--brand)" : t.ring } : undefined}
        >
          {compact ? (
            theme === t.id && <Check size={13} strokeWidth={3} color={t.id === "blanco" ? "#16734b" : "#c5ff5b"} />
          ) : (
            <>
              <span className="grid place-items-center w-7 h-7 rounded-full border" style={{ background: t.swatch, borderColor: t.ring }}>
                {theme === t.id && <Check size={13} strokeWidth={3} color={t.id === "blanco" ? "#16734b" : "#c5ff5b"} />}
              </span>
              {t.label}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
