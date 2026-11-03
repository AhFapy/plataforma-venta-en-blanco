import { requireMember } from "@/lib/auth";
import { RapidGame } from "../RapidGame";

export const metadata = { title: "Ping Pong de Objeciones" };

export default async function Page() {
  const { supabase, profile } = await requireMember();
  const { data } = await supabase.from("game_sessions").select("score").eq("user_id", profile.id).eq("game", "ping_pong").not("finished_at", "is", null).order("score", { ascending: false }).limit(1).maybeSingle();
  return (
    <RapidGame best={data?.score ?? null} cfg={{
      game: "ping_pong", title: "Ping Pong de", emphasis: "Objeciones.", quote: true,
      intro: "Lo que te va a salvar en llamadas reales es la velocidad mental. Aquí la entrenas sin dinero en juego.",
      rules: ["12 objeciones, 12 segundos cada una, 3 vidas.", "Elige la respuesta que validaría y preguntaría de verdad.", "Cuanto antes aciertes, más puntos. Encadena aciertos y multiplicas."],
    }} />
  );
}
