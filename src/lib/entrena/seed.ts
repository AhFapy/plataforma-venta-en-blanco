import "server-only";
import { createHash } from "node:crypto";
import quiz from "../../../supabase/entrena/quiz.json";
import rapid from "../../../supabase/entrena/rapid.json";
import order from "../../../supabase/entrena/order.json";
import scenarios from "../../../supabase/entrena/scenarios.json";
import badges from "../../../supabase/entrena/badges.json";

/** UUID estable: volver a cargar el contenido actualiza las preguntas, no las duplica. */
function stableId(key: string) {
  const h = createHash("md5").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Baraja siempre igual para la misma clave. En los ficheros la respuesta buena va la primera. */
function shuffle<T>(items: T[], key: string): T[] {
  return items
    .map((v, i) => ({ v, k: createHash("md5").update(`${key}:${i}`).digest("hex") }))
    .sort((a, b) => a.k.localeCompare(b.k))
    .map((x) => x.v);
}

function withCorrect(options: string[], key: string) {
  const good = options[0];
  const shuffled = shuffle(options, key);
  return { options: shuffled, correct: shuffled.indexOf(good) };
}

type RawOption = { t: string; d: number; next: string; fb: string };
type RawNode = { options?: RawOption[] } & Record<string, unknown>;

export function buildSeed() {
  return {
    badges: badges.map((b, i) => ({ ...b, position: i + 1 })),
    quiz: quiz.flatMap((m) =>
      m.questions.map((q, i) => {
        const key = `quiz:${m.course}:${m.module}:${q.q}`;
        return { id: stableId(key), course: m.course, module: m.module, module_title: m.module_title, position: i + 1, question: q.q, explanation: q.e, ...withCorrect(q.o, key) };
      }),
    ),
    items: [
      ...rapid.ping_pong.map((x) => {
        const key = `ping_pong:${x.p}`;
        return { id: stableId(key), game: "ping_pong", tag: null, prompt: x.p, explanation: x.e, ...withCorrect(x.o, key) };
      }),
      ...rapid.lee.map((x) => {
        const key = `lee:${x.t}:${x.p}`;
        // Las categorías (Racional, Emocional…) van siempre en el mismo orden: se aprende más rápido.
        const sorted = [...x.o].sort((a, b) => a.localeCompare(b, "es"));
        return { id: stableId(key), game: "lee", tag: x.t, prompt: x.p, explanation: x.e, options: sorted, correct: sorted.indexOf(x.o[0]) };
      }),
    ],
    order: order.map((l, i) => ({ slug: l.slug, title: l.title, intro: l.intro, steps: l.steps, explanation: l.e, position: i + 1 })),
    scenarios: scenarios.map((s) => {
      const nodes = Object.fromEntries(
        Object.entries(s.nodes as unknown as Record<string, RawNode>).map(([k, n]) => [k, n.options ? { ...n, options: shuffle(n.options, `${s.slug}:${k}`) } : n]),
      );
      return { slug: s.slug, title: s.title, persona: s.persona, role: s.role, difficulty: s.difficulty, context: s.context, offer: s.offer, start: s.start, nodes, position: s.position };
    }),
  };
}

export const SEED_COUNTS = { quiz: quiz.reduce((a, m) => a + m.questions.length, 0), pingPong: rapid.ping_pong.length, lee: rapid.lee.length, order: order.length, scenarios: scenarios.length, badges: badges.length };
