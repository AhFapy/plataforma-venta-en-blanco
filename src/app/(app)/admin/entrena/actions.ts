"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { buildSeed } from "@/lib/entrena/seed";

export async function loadContent() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("entrena_load", { p: buildSeed() });
  if (error) return { error: error.message };
  revalidatePath("/admin/entrena");
  return { data: data as { quiz: number; items: number; order: number; scenarios: number; badges: number; skipped: string[] } };
}

export async function setOpen(open: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("entrena_publish", { p_open: open });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
