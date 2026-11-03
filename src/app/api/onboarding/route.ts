import { NextResponse } from "next/server";
import { grantAccess } from "@/lib/access";

/**
 * Alta desde el onboarding de GHL (app.trudsales.com): quien rellena el opt-in
 * no vuelve a meter sus datos. El teléfono se pide después, en /bienvenida.
 */
const CORS = {
  "Access-Control-Allow-Origin": "https://app.trudsales.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  if (req.headers.get("origin") !== "https://app.trudsales.com") {
    return NextResponse.json({ error: "origen no permitido" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "json inválido" }, { status: 400, headers: CORS }); }

  const str = (k: string, max: number) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const full_name = str("full_name", 120);
  const email = str("email", 200).toLowerCase();
  if (full_name.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "datos no válidos" }, { status: 400, headers: CORS });
  }

  const r = await grantAccess({ full_name, email, phone: "" });
  return NextResponse.json(r, { status: r.error ? 500 : 200, headers: CORS });
}
