import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSeed } from "@/lib/entrena/seed";

/** Actualiza el contenido de Entrena con un token de un solo uso (en la base de datos solo está su hash). */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const db = createAdminClient();
  const { data } = await db.from("app_settings").select("value").eq("key", "entrena_seed_hash").maybeSingle();
  if (!t || !data?.value || data.value !== createHash("sha256").update(t).digest("hex")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: res, error } = await db.rpc("entrena_load", { p: buildSeed() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from("app_settings").delete().eq("key", "entrena_seed_hash");
  return NextResponse.json(res);
}
