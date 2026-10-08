import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Enlace mágico del email (alternativa al código)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) await supabase.auth.exchangeCodeForSession(code);
  else if (token_hash && type) await supabase.auth.verifyOtp({ token_hash, type });

  return NextResponse.redirect(new URL("/", url.origin));
}
