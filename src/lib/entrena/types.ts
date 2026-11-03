export type NewBadge = { slug: string; name: string; description: string; icon: string; points: number };

export type RapidItem = { id: string; prompt: string; options: string[]; tag: string | null; limit: number };
export type RapidStart = { session: string; lives: number; total: number; item: RapidItem };
export type RapidSummary = { score: number; hits: number; total: number; best_combo: number; xp: number; best: number; badges: NewBadge[] };
export type RapidAnswer = { ok: boolean; timeout: boolean; correct: number; explanation: string | null; gained: number; score: number; lives: number; combo: number; idx: number; done: boolean; next: RapidItem | null; summary: RapidSummary | null };

export type DailyQ = { id: string; question: string; options: string[] };
export type Daily = { questions: DailyQ[]; answers: number[]; hits: number; finished: boolean; streak: number; best: number };
export type DailyAnswer = { ok: boolean; correct: number; explanation: string | null; finished: boolean; hits: number; xp: number; streak: number; badges: NewBadge[] };

export type OrderLevel = { slug: string; title: string; intro: string | null; steps: string[] };
export type OrderResult = { marks: boolean[]; good: number; total: number; solved: boolean; attempts: number; xp: number; explanation: string | null; badges: NewBadge[] };

export type SimNode = { id: string; stage: string; lead: string; options: string[] };
export type SimStart = { run: string; trust: number; title: string; persona: string; role: string; context: string | null; offer: string | null; node: SimNode };
export type SimStep = { stage: string; lead: string; chose: string; d: number; fb: string };
export type SimEnding = { result: string; title: string; body: string; lesson: string; won: boolean; xp: number; badges: NewBadge[]; history: SimStep[] };
export type SimChoice = { d: number; fb: string; trust: number; done: boolean; next: SimNode | null; ending: SimEnding | null };
