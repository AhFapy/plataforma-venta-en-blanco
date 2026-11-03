import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSeed } from "@/lib/entrena/seed";

/** Carga del contenido de Entrena con un token de un solo uso guardado en la base de datos. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t");
  const db = createAdminClient();
  const { data } = await db.from("app_settings").select("value").eq("key", "entrena_seed_token").maybeSingle();
  if (!t || !data?.value || data.value !== t) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: res, error } = await db.rpc("entrena_load", { p: buildSeed() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from("app_settings").delete().eq("key", "entrena_seed_token");
  return NextResponse.json(res);
}
