import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export default function NoAccess() {
  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Tu acceso está <span className="em">pausado</span></h1>
        <p className="text-ink-muted">Si crees que es un error, escríbenos y lo revisamos.</p>
        <div className="flex justify-center gap-3">
          <a className="btn btn-dark" href="https://app.trudsales.com/contacta-con-soporte">Contactar con soporte</a>
          <SignOutButton className="btn btn-ghost" />
        </div>
      </div>
    </main>
  );
}
