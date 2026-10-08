"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type R = { ok?: boolean; error?: string; msg?: string };

/** Formulario que llama a una server action y muestra el resultado. */
export function ActionForm({
  action, children, className = "", submit = "Guardar", resetOnOk = false, confirmText,
}: {
  action: (f: FormData) => Promise<R>;
  children: React.ReactNode;
  className?: string;
  submit?: string;
  resetOnOk?: boolean;
  confirmText?: string;
}) {
  const [res, setRes] = useState<R | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !confirm(confirmText)) return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const r = await action(fd);
          setRes(r);
          if (r.ok) { if (resetOnOk) form.reset(); router.refresh(); }
        });
      }}
    >
      {children}
      <div className="flex items-center gap-3 mt-4">
        <button className="btn btn-dark !py-2" disabled={pending}>{pending ? "Guardando…" : submit}</button>
        {res?.error && <span className="text-sm text-red-700">{res.error}</span>}
        {res?.ok && <span className="text-sm text-brand">{res.msg ?? "Guardado"}</span>}
        {res && !res.ok && !res.error && res.msg && <span className="text-sm text-ink-muted">{res.msg}</span>}
      </div>
    </form>
  );
}

export function DeleteButton({ onDelete, label = "Borrar", confirmText = "¿Seguro? No se puede deshacer." }: { onDelete: () => Promise<R>; label?: string; confirmText?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-red-700 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        start(async () => { await onDelete(); router.refresh(); });
      }}
    >
      {pending ? "Borrando…" : label}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}
