import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "@/components/ProfileForm";
import { firstName } from "@/lib/utils";
import { AvatarUpload } from "@/app/(app)/perfil/AvatarUpload";

export const metadata = { title: "Bienvenida" };

export default async function Welcome() {
  const { profile } = await requireMember({ allowNotOnboarded: true });
  if (profile.onboarded_at) redirect("/");

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <Logo />
      <div className="mt-12 mb-10 fade-in">
                <h1 className="text-[40px] sm:text-[52px] leading-[1.03] font-semibold tracking-[-0.035em]">
          Bienvenido{firstName(profile.full_name) ? `, ${firstName(profile.full_name)}` : ""}. <span className="em">Empezamos.</span>
        </h1>
        <p className="mt-4 text-ink-muted text-lg">Cuéntanos de dónde partes y a dónde vas. Con esto el equipo te sigue de cerca y tú no pierdes el foco.</p>
      </div>
      <section className="space-y-4 mb-10">
        <p className="label">Tu foto de perfil</p>
        <AvatarUpload name={profile.full_name} url={profile.avatar_url} required />
      </section>
      <ProfileForm profile={profile} submitLabel="Entrar a la plataforma" />
    </main>
  );
}
