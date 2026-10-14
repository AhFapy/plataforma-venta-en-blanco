"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { requestAccess } from "./actions";

export default function RequestAccessPage() {
  const [res, setRes] = useState<{ ok?: boolean; already?: boolean; pending?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const loginHref = `/login?email=${encodeURIComponent(email.trim().toLowerCase())}`;

  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <section className="on-dark hidden lg:flex flex-col justify-between bg-bg-dark p-12 text-[#f5f4ef]">
        <Logo dark />
        <div>
          <h1 className="text-7xl font-semibold tracking-[-0.04em] leading-[0.98]">
            Venta en <span className="em">Blanco.</span>
          </h1>
          <p className="mt-7 max-w-md text-[#a4a8a4] text-lg leading-relaxed">
            Rellena tus datos y entra. Así de simple.
          </p>
        </div>
        <span />
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="lg:hidden mb-12"><Logo /></div>
        <div className="max-w-sm w-full fade-in">
          {res?.ok ? (
            <div className="space-y-5">
              <CheckCircle2 size={40} className="text-brand" />
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Ya tienes <span className="em">acceso</span></h2>
              <p className="text-ink-muted">Entra con tu email: te mandamos un código y listo.</p>
              <Link href={loginHref} className="btn btn-dark w-full justify-center">Entrar ahora <ArrowRight size={16} /></Link>
            </div>
          ) : res?.pending ? (
            <div className="space-y-5">
              <CheckCircle2 size={40} className="text-brand" />
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Solicitud <span className="em">enviada</span></h2>
              <p className="text-ink-muted">El equipo la revisará en breve. Cuando esté aceptada, podrás entrar con tu email.</p>
            </div>
          ) : res?.already ? (
            <div className="space-y-5">
              <CheckCircle2 size={40} className="text-brand" />
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Ya tienes <span className="em">acceso</span></h2>
              <p className="text-ink-muted">Este email ya está dado de alta. Entra directamente.</p>
              <Link href={loginHref} className="btn btn-dark w-full justify-center">Entrar <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => setRes(await requestAccess(fd)));
              }}
            >
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Accede a la <span className="em">plataforma</span></h2>
              <p className="text-ink-muted">Usa el mismo email con el que te inscribiste.</p>
              <input name="full_name" className="input" required autoComplete="name" placeholder="Nombre y apellidos" />
              <input name="email" className="input" type="email" required autoComplete="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input name="phone" className="input" type="tel" required autoComplete="tel" placeholder="Teléfono (WhatsApp)" />
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              {res?.error && <p className="text-sm text-red-700">{res.error}</p>}
              <button className="btn btn-dark w-full justify-center" disabled={pending}>
                {pending ? "Un momento…" : "Acceder"} <ArrowRight size={16} />
              </button>
              <p className="text-sm text-ink-muted">¿Ya tienes acceso? <Link href="/login" className="underline">Entra aquí</Link></p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
