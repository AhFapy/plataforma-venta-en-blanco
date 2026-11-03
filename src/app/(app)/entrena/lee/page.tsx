import { requireMember } from "@/lib/auth";
import { RapidGame } from "../RapidGame";

export const metadata = { title: "Lee al lead" };

export default async function Page() {
  const { supabase, profile } = await requireMember();
  const { data } = await supabase.from("game_sessions").select("score").eq("user_id", profile.id).eq("game", "lee").not("finished_at", "is", null).order("score", { ascending: false }).limit(1).maybeSingle();
  return (
    <RapidGame best={data?.score ?? null} cfg={{
      game: "lee", title: "Lee al", emphasis: "lead.",
      intro: "El mediocre habla. El bueno escucha. El excelente siente. Detecta qué hay detrás de lo que te dicen.",
      rules: ["12 situaciones, 9 segundos cada una, 3 vidas.", "Perfil, canal, cerebro, objeción real, escucha y más.", "Sin pensar demasiado: en la llamada tampoco tendrás tiempo."],
    }} />
  );
}
