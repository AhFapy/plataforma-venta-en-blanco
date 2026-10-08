"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-[60dvh] grid place-items-center px-6">
      <div className="max-w-md text-center space-y-5">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Algo ha <span className="em">fallado.</span></h1>
        <p className="text-ink-muted">Prueba otra vez. Si se repite, escríbenos a soporte.</p>
        <div className="flex justify-center gap-3">
          <button className="btn btn-dark" onClick={reset}>Reintentar</button>
          <a className="btn btn-ghost" href="https://app.trudsales.com/contacta-con-soporte">Soporte</a>
        </div>
      </div>
    </main>
  );
}
