import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { enrollStudent } from "@/lib/enroll";

/**
 * Alta automática desde GHL al cerrar una venta.
 * POST /api/webhooks/alta  (header  x-webhook-secret: <WEBHOOK_SECRET>)
 * Body JSON: { email, full_name?, phone?, cohort? }
 * Acepta también los nombres de campo típicos de GHL (first_name, last_name).
 */
export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  const got = req.headers.get("x-webhook-secret") ?? "";
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "json inválido" }, { status: 400 }); }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const email = str("email");
  const full_name = str("full_name") || [str("first_name"), str("last_name")].filter(Boolean).join(" ");
  const cohort = str("cohort") || new Date().toISOString().slice(0, 7); // promoción por defecto: año-mes

  if (!email) return NextResponse.json({ error: "falta email" }, { status: 400 });

  try {
    const r = await enrollStudent({ email, full_name, phone: str("phone"), cohort });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
