"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { saveProfile } from "@/app/profile-actions";
import type { Profile } from "@/lib/types";

const SITUATIONS = [
  "Empiezo desde cero en ventas",
  "Tengo trabajo y quiero cambiar",
  "Ya vendo y quiero ganar más",
  "Estudio",
  "Otra",
];

export function ProfileForm({ profile, submitLabel }: { profile: Profile; submitLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null); setSaved(false);
          const res = await saveProfile(fd);
          if (res.error) { setError(res.error); return; }
          if (res.first) { router.replace("/"); router.refresh(); return; }
          setSaved(true);
        })
      }
      className="space-y-10"
    >
      <section className="space-y-4">
        <p className="label">01 · Sobre ti</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nombre y apellidos"><input name="full_name" className="input" required defaultValue={profile.full_name ?? ""} /></Field>
          <Field label="Teléfono (WhatsApp)"><input name="phone" className="input" defaultValue={profile.phone ?? ""} placeholder="+34 …" /></Field>
        </div>
        <Field label="Preséntate en dos líneas">
          <textarea name="bio" className="input min-h-24" maxLength={600} defaultValue={profile.bio ?? ""} placeholder="A qué te dedicas, de dónde eres, por qué estás aquí" />
        </Field>
      </section>

      <section className="space-y-4">
        <p className="label">02 · Tu punto de partida</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Situación actual">
            <select name="situation" className="input" defaultValue={profile.situation ?? ""} required>
              <option value="" disabled>Elige una</option>
              {SITUATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Horas a la semana que puedes dedicar">
            <input name="weekly_hours" type="number" min={1} max={80} className="input" defaultValue={profile.weekly_hours ?? ""} required />
          </Field>
        </div>
        <Field label="¿Qué quieres conseguir en estos 6 meses?">
          <textarea name="goal" className="input min-h-20" defaultValue={profile.goal ?? ""} required />
        </Field>
      </section>

      <section className="space-y-4">
        <p className="label">03 · Tus 3 objetivos</p>
        <p className="text-sm text-ink-muted -mt-2">Los verás cada día al entrar.</p>
        {[0, 1, 2].map((i) => (
          <input key={i} name={`objective${i}`} className="input" required defaultValue={profile.objectives[i] ?? ""} placeholder={`Objetivo ${i + 1}`} />
        ))}
      </section>

      <section className="space-y-4">
        <p className="label">04 · 3 puntos a mejorar</p>
        {[0, 1, 2].map((i) => (
          <input key={i} name={`improvement${i}`} className="input" required defaultValue={profile.improvements[i] ?? ""} placeholder={`Punto ${i + 1}`} />
        ))}
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center gap-4">
        <button className="btn btn-dark" disabled={pending}>{pending ? "Guardando…" : submitLabel} <ArrowRight size={16} /></button>
        {saved && <span className="text-sm text-brand">Guardado</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
