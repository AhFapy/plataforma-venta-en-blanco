import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

// Cliente con service role: SOLO en servidor (altas, importación, webhook).
export function createAdminClient() {
  return createClient(SUPABASE_URL, (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
