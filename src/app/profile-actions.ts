"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";

function three(form: FormData, key: string) {
  return [0, 1, 2].map((i) => String(form.get(`${key}${i}`) || "").trim().slice(0, 200)).filter(Boolean);
}

function clean(v: FormDataEntryValue | null, max = 500) {
  const s = String(v ?? "").trim().slice(0, max);
  return s || null;
}

export async function saveProfile(form: FormData) {
  const { supabase, user, profile } = await requireMember({ allowNotOnboarded: true });
  const objectives = three(form, "objective");
  const improvements = three(form, "improvement");
  const full_name = clean(form.get("full_name"), 120);

  if (!full_name || objectives.length < 3 || improvements.length < 3) {
    return { error: "Completa tu nombre, tus 3 objetivos y tus 3 puntos a mejorar." };
  }
  if (!profile.avatar_url) return { error: "Sube tu foto de perfil para continuar." };
  let situation = clean(form.get("situation"), 60);
  if (situation === "Otra") {
    const other = clean(form.get("situation_other"), 80);
    if (!other) return { error: "Cuéntanos cuál es tu situación." };
    situation = `Otra: ${other}`;
  }

  const hours = Number(form.get("weekly_hours"));
  const { error: e1 } = await supabase
    .from("profile_private")
    .update({
      phone: clean(form.get("phone"), 40),
      situation,
      goal: clean(form.get("goal"), 600),
      weekly_hours: Number.isFinite(hours) && hours > 0 ? Math.min(hours, 80) : null,
      objectives,
      improvements,
    })
    .eq("id", user.id);
  const { error: e2 } = e1
    ? { error: e1 }
    : await supabase
        .from("profiles")
        .update({ full_name, bio: clean(form.get("bio"), 600), onboarded_at: profile.onboarded_at ?? new Date().toISOString() })
        .eq("id", user.id);
  const error = e1 || e2;
  if (error) return { error: "No se ha podido guardar. Prueba de nuevo." };

  revalidatePath("/", "layout");
  return { ok: true, first: !profile.onboarded_at };
}

export async function saveAvatar(form: FormData) {
  const { supabase, user, profile } = await requireMember({ allowNotOnboarded: true });
  const file = form.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "Elige una imagen." };
  if (file.size > 3 * 1024 * 1024) return { error: "Imagen de máximo 3 MB." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { error: "Usa una foto JPG, PNG o WEBP." };
  const old = profile.avatar_url?.split("/avatars/")[1];
  const ext = file.type.split("/")[1] || "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { error: "No se ha podido subir la imagen." };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
  if (old) await supabase.storage.from("avatars").remove([decodeURIComponent(old)]);
  revalidatePath("/", "layout");
  return { ok: true };
}
