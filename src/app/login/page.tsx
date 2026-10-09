"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // Solo entran alumnos dados de alta: nadie se registra solo
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(
        /signups not allowed|not found|invalid/i.test(error.message)
          ? "Este email no está dado de alta. Usa el mismo con el que te inscribiste o escribe a soporte."
          : "No hemos podido enviar el código. Prueba en un minuto."
      );
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setLoading(false);
    if (error) { setError("Código incorrecto o caducado."); return; }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <section className="on-dark hidden lg:flex flex-col justify-between bg-bg-dark p-12 text-[#f5f4ef]">
        <Logo dark />
        <div>
          <p className="label !text-[#a4a8a4] mb-5">Venta en Blanco</p>
          <h1 className="text-6xl font-semibold tracking-[-0.03em] leading-[1.02]">
            Vendedores que <span className="em">venden más.</span>
          </h1>
          <p className="mt-6 max-w-md text-[#a4a8a4] text-lg">Aprende el método, genera ingresos reales y entra en proyectos serios dentro del ecosistema Trud.</p>
        </div>
        <p className="label !text-[#6b6f6c]">Sin trucos · Sin adornos</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="lg:hidden mb-12"><Logo /></div>
        <div className="max-w-sm w-full fade-in">
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-5">
              <span className="badge badge-dot">Acceso alumnos</span>
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Entra a tu <span className="em">plataforma</span></h2>
              <p className="text-ink-muted">Te mandamos un código de 6 cifras a tu email. Sin contraseñas.</p>
              <input className="input" type="email" required autoFocus placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button className="btn btn-dark w-full justify-center" disabled={loading}>
                {loading ? "Enviando…" : "Enviarme el código"} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-5">
              <span className="badge badge-dot">Revisa tu email</span>
              <h2 className="text-4xl font-semibold tracking-[-0.03em]">Revisa tu <span className="em">email</span></h2>
              <p className="text-ink-muted">Lo hemos enviado a <b className="text-ink">{email}</b>. Escribe aquí el código o pulsa el enlace del email desde este mismo navegador. Si no aparece, mira en spam o promociones.</p>
              <input className="input text-center text-2xl tracking-[.5em] font-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button className="btn btn-brand w-full justify-center" disabled={loading || code.length < 6}>
                {loading ? "Entrando…" : "Entrar"} <ArrowRight size={16} />
              </button>
              <button type="button" className="text-sm text-ink-muted underline" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
                Usar otro email
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
