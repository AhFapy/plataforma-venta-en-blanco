"use client";

import { useState, useTransition } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { setStudentPassword } from "../../actions";

export function PasswordForm({ id }: { id: string }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [res, setRes] = useState<{ ok?: boolean; error?: string; msg?: string } | null>(null);
  const [pending, start] = useTransition();

  const gen = () => {
    const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const a = crypto.getRandomValues(new Uint32Array(10));
    setPw(Array.from(a, (x) => c[x % c.length]).join(""));
    setShow(true);
    setRes(null);
  };

  return (
    <section className="card p-6 space-y-3">
      <p className="label">Contraseña</p>
      <p className="text-sm text-ink-muted">Pon una nueva y pásasela al alumno. Entra desde el login con «Tengo contraseña».</p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await setStudentPassword(id, pw);
            setRes(r);
          });
        }}
      >
        <div className="relative flex-1">
          <input
            className="input w-full pr-10"
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => { setPw(e.target.value); setRes(null); }}
            placeholder="Nueva contraseña (mín. 8)"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted" aria-label="Mostrar">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="button" onClick={gen} className="btn btn-ghost !py-2">Generar</button>
        <button disabled={pending || pw.length < 8} className="btn btn-brand !py-2"><KeyRound size={15} /> {pending ? "Guardando…" : "Cambiar"}</button>
      </form>
      {res && <p className={`text-sm ${res.error ? "text-red-700" : "text-green-800"}`}>{res.error ?? res.msg}</p>}
    </section>
  );
}
