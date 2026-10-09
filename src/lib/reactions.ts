export const REACTIONS = ["🔥", "👏", "💪", "🙌", "😂", "🤯"] as const;
export type Reaction = { user_id: string; emoji: string };

/** Agrupa reacciones por emoji en el orden fijo, solo las que tienen al menos una. */
export function groupReactions(rows: Reaction[], me: string) {
  return REACTIONS.map((e) => {
    const of = rows.filter((r) => r.emoji === e);
    return { emoji: e, count: of.length, mine: of.some((r) => r.user_id === me) };
  }).filter((g) => g.count > 0);
}
