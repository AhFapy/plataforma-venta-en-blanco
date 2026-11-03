"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import type { Daily, DailyAnswer, OrderLevel, OrderResult, RapidAnswer, RapidStart, SimChoice, SimStart } from "@/lib/entrena/types";

type R<T> = { data?: T; error?: string };

async function call<T>(fn: string, args: Record<string, unknown> | undefined, fallback: string): Promise<R<T>> {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { error: fallback };
  return { data: data as T };
}

const done = () => revalidatePath("/entrena", "layout");

export async function dailyGet() { return call<Daily>("daily_get", undefined, "No se ha podido cargar el reto."); }
export async function dailyAnswer(answer: number) {
  const r = await call<DailyAnswer>("daily_answer", { p_answer: answer }, "No se ha podido guardar. Inténtalo de nuevo.");
  if (r.data?.finished) { done(); revalidatePath("/"); }
  return r;
}

export async function gameStart(game: "ping_pong" | "lee") { return call<RapidStart>("game_start", { p_game: game }, "No se ha podido empezar la partida."); }
export async function gameAnswer(session: string, answer: number) {
  const r = await call<RapidAnswer>("game_answer", { p_session: session, p_answer: answer }, "Se ha perdido la conexión con la partida.");
  if (r.data?.done) done();
  return r;
}
export async function gameTick(session: string) { await call("game_tick", { p_session: session }, ""); }

export async function orderGet(slug: string) { return call<OrderLevel>("order_get", { p_slug: slug }, "No se ha podido cargar el nivel."); }
export async function orderSubmit(slug: string, order: string[]) {
  const r = await call<OrderResult>("order_submit", { p_slug: slug, p_order: order }, "No se ha podido corregir. Inténtalo de nuevo.");
  if (r.data?.solved) done();
  return r;
}

export async function simStart(slug: string) { return call<SimStart>("sim_start", { p_slug: slug }, "No se ha podido empezar la llamada."); }
export async function simChoose(run: string, option: number) {
  const r = await call<SimChoice>("sim_choose", { p_run: run, p_option: option }, "No se ha podido continuar la llamada.");
  if (r.data?.done) done();
  return r;
}
