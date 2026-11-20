import { requireMember } from "@/lib/auth";
import { getCurriculum } from "@/lib/data";
import { PageHeader } from "@/components/PageHeader";
import { CourseCard, courseTree } from "@/components/CourseCard";

export const metadata = { title: "Formación" };

export default async function Formacion() {
  const { supabase, profile } = await requireMember();
  const cur = await getCurriculum(supabase, profile);
  const visibleIds = new Set(cur.courses.map((c) => c.id));
  // Solo las formaciones de primer nivel; las hijas se ven dentro de su formación padre
  const top = cur.courses.filter((c) => !c.parent_id || !visibleIds.has(c.parent_id));

  return (
    <div className="fade-in">
      <PageHeader label="Formación" title="El método," emphasis="paso a paso." />
      {top.length === 0 && <p className="text-ink-muted">Todavía no hay cursos publicados.</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {top.map((c) => {
          const ids = courseTree(cur.courses, c.id);
          return <CourseCard key={c.id} c={c} lessons={cur.ordered.filter((l) => ids.has(l.course.id))} completed={cur.completed} />;
        })}
      </div>
    </div>
  );
}
