import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { AvatarUpload } from "./AvatarUpload";
import { ThemePicker } from "@/components/ThemePicker";

export const metadata = { title: "Mi perfil" };

export default async function MyProfile() {
  const { profile } = await requireMember();
  return (
    <div className="fade-in max-w-2xl">
      <PageHeader title="Tu" emphasis="perfil." />
      <AvatarUpload name={profile.full_name} url={profile.avatar_url} />
      <p className="text-sm text-ink-muted mt-6">Email de acceso: <b className="text-ink">{profile.email}</b></p>
      <section className="mt-8 mb-10 space-y-3">
        <p className="label">Color de la plataforma</p>
        <ThemePicker />
      </section>
      <ProfileForm profile={profile} submitLabel="Guardar cambios" />
    </div>
  );
}
