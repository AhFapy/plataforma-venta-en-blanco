import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Registra que el alumno ha abierto la grabación (métricas) y le redirige a ella
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const origin = new URL(request.url).origin;
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: ev } = await supabase.from("events").select("recording_url").eq("id", id).maybeSingle();
  if (!ev?.recording_url) return NextResponse.redirect(new URL("/eventos", origin));

  await supabase.from("event_views").upsert({ user_id: user.id, event_id: id, viewed_at: new Date().toISOString() }, { onConflict: "user_id,event_id" });
  const target = /^https?:\/\//.test(ev.recording_url) ? ev.recording_url : new URL(ev.recording_url, origin).toString();
  return NextResponse.redirect(target);
}
