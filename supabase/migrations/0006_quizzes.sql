-- Quiz al final de cada módulo. La respuesta correcta nunca sale al navegador:
-- se corrige en la base de datos con submit_quiz().

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  position int not null default 1,
  question text not null,
  options text[] not null check (array_length(options, 1) between 2 and 6),
  correct int not null,           -- índice 0-based en options
  explanation text,
  created_at timestamptz not null default now(),
  check (correct >= 0 and correct < array_length(options, 1))
);
create index if not exists quiz_questions_module on public.quiz_questions (module_id, position);

create table if not exists public.quiz_attempts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  score int not null,
  total int not null,
  best int not null,
  passed boolean not null default false,
  attempts int not null default 1,
  answers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "quiz: miembros leen" on public.quiz_questions for select to authenticated using (is_member());
create policy "quiz: equipo gestiona" on public.quiz_questions for all to authenticated using (is_staff()) with check (is_staff());
create policy "intentos: los míos o equipo" on public.quiz_attempts for select to authenticated using (user_id = auth.uid() or is_staff());

-- Ocultar la columna correcta / explicación a los alumnos (el equipo la lee vía la función de admin)
revoke select on public.quiz_questions from authenticated;
grant select (id, module_id, position, question, options) on public.quiz_questions to authenticated;
grant insert, update, delete on public.quiz_questions to authenticated;

create or replace function public.quiz_admin_list(p_module uuid)
returns setof public.quiz_questions language sql security definer set search_path = public stable as $$
  select * from quiz_questions where module_id = p_module and is_staff() order by position, created_at;
$$;

-- Corrige, guarda el mejor resultado y da puntos la primera vez que se aprueba (>= 70 %).
create or replace function public.submit_quiz(p_module uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  qs record; total int := 0; score int := 0; results jsonb := '[]'::jsonb; i int := 0;
  ok boolean; passed boolean; prev quiz_attempts;
begin
  if not is_member() then raise exception 'sin acceso'; end if;
  for qs in select * from quiz_questions where module_id = p_module order by position, created_at loop
    i := i + 1; total := total + 1;
    ok := coalesce(p_answers[i], -1) = qs.correct;
    if ok then score := score + 1; end if;
    results := results || jsonb_build_object('id', qs.id, 'ok', ok, 'correct', qs.correct, 'explanation', qs.explanation);
  end loop;
  if total = 0 then raise exception 'este módulo no tiene quiz'; end if;
  passed := score * 100 >= total * 70;

  select * into prev from quiz_attempts where user_id = auth.uid() and module_id = p_module;
  insert into quiz_attempts (user_id, module_id, score, total, best, passed, attempts, answers, updated_at)
  values (auth.uid(), p_module, score, total, score, passed, 1, to_jsonb(p_answers), now())
  on conflict (user_id, module_id) do update set
    score = excluded.score, total = excluded.total,
    best = greatest(quiz_attempts.best, excluded.score),
    passed = quiz_attempts.passed or excluded.passed,
    attempts = quiz_attempts.attempts + 1,
    answers = excluded.answers, updated_at = now();

  if passed then perform award(auth.uid(), 'quiz', 20, p_module::text); end if;

  return jsonb_build_object('score', score, 'total', total, 'passed', passed, 'results', results,
                            'first_pass', passed and not coalesce(prev.passed, false));
end $$;

revoke all on function public.submit_quiz(uuid, int[]) from public, anon;
grant execute on function public.submit_quiz(uuid, int[]) to authenticated;
revoke all on function public.quiz_admin_list(uuid) from public, anon;
grant execute on function public.quiz_admin_list(uuid) to authenticated;
