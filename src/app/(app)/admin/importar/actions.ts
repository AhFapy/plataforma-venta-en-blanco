"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";

/** Importa la comunidad antigua de GHL (posts + comentarios) desde el JSON exportado. Sin notificaciones ni puntos. */
export async function importCommunity(json: string): Promise<{ error?: string; posts?: number; comments?: number }> {
  const { supabase } = await requireStaff();
  let payload: unknown;
  try { payload = JSON.parse(json); } catch { return { error: "El archivo no es un JSON válido." }; }
  const p = payload as { U?: unknown; P?: unknown[]; C?: unknown[] };
  if (!p.U || !Array.isArray(p.P) || !Array.isArray(p.C)) return { error: "No parece la exportación de la comunidad." };
  const { data, error } = await supabase.rpc("import_ghl_community", { payload });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return data as { posts: number; comments: number };
}
