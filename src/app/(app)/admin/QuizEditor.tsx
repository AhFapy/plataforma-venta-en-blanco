import { ActionForm, DeleteButton, Field } from "./ActionForm";
import { deleteQuizQuestion, saveQuizQuestion } from "./quiz-actions";

export type QuizQ = { id: string; module_id: string; position: number; question: string; options: string[]; correct: number; explanation: string | null };

function QuestionFields({ moduleId, q, nextPos }: { moduleId: string; q?: QuizQ; nextPos?: number }) {
  const opts = [...(q?.options ?? []), "", "", "", ""].slice(0, Math.max(4, q?.options.length ?? 0));
  return (
    <div className="space-y-3">
      <input type="hidden" name="module_id" value={moduleId} />
      {q && <input type="hidden" name="id" value={q.id} />}
      <div className="grid sm:grid-cols-[1fr_90px] gap-3">
        <Field label="Pregunta"><input name="question" className="input" defaultValue={q?.question} required /></Field>
        <Field label="Orden"><input name="position" type="number" className="input" defaultValue={q?.position ?? nextPos ?? 1} /></Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Respuestas <span className="text-ink-faint font-normal">· marca la correcta</span></p>
        {opts.map((o, i) => (
          <label key={i} className="flex items-center gap-3">
            <input type="radio" name="correct" value={i} defaultChecked={q ? q.correct === i : i === 0} className="accent-[#16734b]" />
            <input name={`opt${i}`} className="input flex-1" defaultValue={o} placeholder={`Respuesta ${i + 1}${i >= 2 ? " (opcional)" : ""}`} />
          </label>
        ))}
      </div>
      <Field label="Explicación (se enseña al corregir)"><input name="explanation" className="input" defaultValue={q?.explanation ?? ""} placeholder="Por qué es la correcta" /></Field>
    </div>
  );
}

export function QuizEditor({ moduleId, questions }: { moduleId: string; questions: QuizQ[] }) {
  return (
    <details className="rounded-[14px] bg-bg p-4">
      <summary className="cursor-pointer text-sm font-medium">Quiz del módulo · {questions.length} {questions.length === 1 ? "pregunta" : "preguntas"}</summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-ink-muted">Aparece al terminar todas las clases del módulo. Se aprueba con un 70 % y da 20 puntos la primera vez.</p>
        {questions.map((q) => (
          <details key={q.id} className="rounded-[12px] border border-line bg-surface p-4">
            <summary className="cursor-pointer text-[15px]">{q.position}. {q.question}</summary>
            <div className="mt-4">
              <ActionForm action={saveQuizQuestion}><QuestionFields moduleId={moduleId} q={q} /></ActionForm>
              <div className="mt-3"><DeleteButton onDelete={deleteQuizQuestion.bind(null, q.id)} label="Borrar pregunta" /></div>
            </div>
          </details>
        ))}
        <div className="rounded-[12px] border border-dashed border-line p-4">
          <p className="text-sm font-medium mb-3">+ Nueva pregunta</p>
          <ActionForm action={saveQuizQuestion} submit="Añadir pregunta" resetOnOk>
            <QuestionFields moduleId={moduleId} nextPos={(questions.at(-1)?.position ?? 0) + 1} />
          </ActionForm>
        </div>
      </div>
    </details>
  );
}
