"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setLessonComplete } from "../../actions";

export function CompleteButton({ lessonId, done, nextHref }: { lessonId: string; done: boolean; nextHref: string | null }) {
  const [pending, start] = useTransition();
  const [burst, setBurst] = useState(false);
  const router = useRouter();

  return (
    <div className="relative">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setLessonComplete(lessonId, !done);
            if (res.error) return;
            if (!done) {
              setBurst(true);
              setTimeout(() => setBurst(false), 1400);
              if (nextHref) setTimeout(() => router.push(nextHref), 900);
            }
          })
        }
        className={`btn ${done ? "btn-ghost" : "btn-brand"}`}
      >
        <Check size={16} /> {done ? "Completada" : pending ? "Guardando…" : "Marcar como completada"}
      </button>
      {burst && (
        <span className="pointer-events-none absolute -top-8 right-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-ink fade-in">+10 pts</span>
      )}
    </div>
  );
}
