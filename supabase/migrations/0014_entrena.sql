-- Entrena: reto diario con racha, Ping Pong de Objeciones, Lee al lead, Ordena la llamada,
-- simulador de llamada con decisiones, liga semanal e insignias.
--
-- Reglas de diseño:
--   · Las respuestas correctas nunca salen al navegador: todo se corrige aquí.
--   · Jugar a diario da XP para la liga semanal, que se reinicia cada lunes.
--   · Los puntos de rango (y por tanto la mentoría) solo suben con cosas que se consiguen
--     UNA vez (quiz aprobado, insignia). Así no se llega a la mentoría a base de jugar.
--   · Oculto a los alumnos hasta que un admin lo abre (app_settings.entrena_abierto = '1').

-- ───────────── Apertura ─────────────
insert into public.app_settings (key, value) values ('entrena_abierto', '0') on conflict (key) do nothing;

create or replace function public.entrena_open() returns boolean
language sql stable security definer set search_path = public as $$
  select is_member() and (is_staff() or exists (select 1 from app_settings where key = 'entrena_abierto' and value = '1'));
$$;

create or replace function public.madrid_today() returns date
language sql stable set search_path = public as $$ select (now() at time zone 'Europe/Madrid')::date; $$;

create or replace function public.madrid_week() returns text
language sql stable set search_path = public as $$ select to_char(now() at time zone 'Europe/Madrid', 'IYYY-"W"IW'); $$;

-- ───────────── Quizzes: preguntas en borrador hasta abrir ─────────────
alter table public.quiz_questions add column if not exists published boolean not null default true;

alter policy "quiz: miembros leen" on public.quiz_questions
  using (is_member() and (published or is_staff()));

-- ───────────── Contenido de los juegos ─────────────
create table if not exists public.game_items (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('ping_pong', 'lee')),
  tag text,
  prompt text not null,
  options text[] not null check (array_length(options, 1) between 2 and 5),
  correct int not null,
  explanation text,
  active boolean not null default true,
  check (correct >= 0 and correct < array_length(options, 1))
);
create index if not exists game_items_game on public.game_items (game) where active;

create table if not exists public.game_order_levels (
  slug text primary key,
  title text not null,
  intro text,
  steps text[] not null,        -- en el orden correcto
  explanation text,
  position int not null default 1,
  active boolean not null default true
);

create table if not exists public.game_scenarios (
  slug text primary key,
  title text not null,
  persona text not null,
  role text not null default 'Closer',
  difficulty int not null default 1,
  context text,
  offer text,
  start_node text not null,
  nodes jsonb not null,
  position int not null default 1,
  active boolean not null default true
);

create table if not exists public.game_badges (
  slug text primary key,
  name text not null,
  description text not null,
  icon text not null default 'award',
  points int not null default 0,
  position int not null default 1
);

-- ───────────── Progreso ─────────────
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  items uuid[] not null default '{}',
  idx int not null default 0,
  lives int not null default 3,
  combo int not null default 0,
  best_combo int not null default 0,
  score int not null default 0,
  hits int not null default 0,
  last_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists game_sessions_user on public.game_sessions (user_id, game, finished_at);

create table if not exists public.sim_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario text not null references public.game_scenarios(slug) on delete cascade,
  node text not null,
  trust int not null default 50,
  steps int not null default 0,
  history jsonb not null default '[]'::jsonb,
  result text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists sim_runs_user on public.sim_runs (user_id, scenario);

create table if not exists public.order_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null references public.game_order_levels(slug) on delete cascade,
  week text not null,
  attempts int not null default 0,
  solved boolean not null default false,
  perfect_ever boolean not null default false,
  solved_ever boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create table if not exists public.daily_runs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  questions uuid[] not null,
  answers int[] not null default '{}',
  hits int not null default 0,
  finished boolean not null default false,
  primary key (user_id, day)
);

create table if not exists public.game_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current int not null default 0,
  best int not null default 0,
  last_day date
);

create table if not exists public.game_xp (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  ref text not null,
  xp int not null,
  week text not null default public.madrid_week(),
  created_at timestamptz not null default now(),
  unique (user_id, game, ref)
);
create index if not exists game_xp_week on public.game_xp (week, user_id);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null references public.game_badges(slug) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, slug)
);

-- ───────────── Seguridad ─────────────
alter table public.game_items enable row level security;
alter table public.game_order_levels enable row level security;
alter table public.game_scenarios enable row level security;
alter table public.game_badges enable row level security;
alter table public.game_sessions enable row level security;
alter table public.sim_runs enable row level security;
alter table public.order_progress enable row level security;
alter table public.daily_runs enable row level security;
alter table public.game_streaks enable row level security;
alter table public.game_xp enable row level security;
alter table public.user_badges enable row level security;

-- Las respuestas (correct, steps, nodes) no se pueden leer ni siquiera teniendo sesión.
create policy "items: equipo" on public.game_items for select to authenticated using (is_staff());
revoke all on public.game_items from anon, authenticated;
grant select on public.game_items to authenticated;

create policy "niveles: abiertos" on public.game_order_levels for select to authenticated using (entrena_open());
revoke all on public.game_order_levels from anon, authenticated;
grant select (slug, title, intro, position, active) on public.game_order_levels to authenticated;

create policy "escenarios: abiertos" on public.game_scenarios for select to authenticated using (entrena_open());
revoke all on public.game_scenarios from anon, authenticated;
grant select (slug, title, persona, role, difficulty, context, offer, position, active) on public.game_scenarios to authenticated;

create policy "insignias: miembros" on public.game_badges for select to authenticated using (is_member());
revoke all on public.game_badges from anon, authenticated;
grant select on public.game_badges to authenticated;

-- Progreso: cada uno ve el suyo; nadie escribe directo (solo las funciones de abajo).
create policy "sesiones: mías" on public.game_sessions for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "sim: mías" on public.sim_runs for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "orden: mío" on public.order_progress for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "reto: mío" on public.daily_runs for select to authenticated using (user_id = auth.uid() or is_staff());
create policy "racha: miembros" on public.game_streaks for select to authenticated using (is_member());
create policy "xp: miembros" on public.game_xp for select to authenticated using (is_member());
create policy "insignias usuario: miembros" on public.user_badges for select to authenticated using (is_member());

revoke all on public.game_sessions, public.sim_runs, public.order_progress, public.daily_runs,
  public.game_streaks, public.game_xp, public.user_badges from anon, authenticated;
grant select on public.game_sessions, public.sim_runs, public.order_progress, public.daily_runs,
  public.game_streaks, public.game_xp, public.user_badges to authenticated;

-- ───────────── Liga ─────────────
create or replace view public.league_week with (security_invoker = true) as
select p.id as user_id, p.full_name, p.avatar_url, p.cohort, sum(x.xp)::int as xp
from public.game_xp x
join public.profiles p on p.id = x.user_id
where x.week = public.madrid_week() and p.active and p.role = 'alumno'
group by p.id;

revoke all on public.league_week from anon;
grant select on public.league_week to authenticated;

-- ───────────── Internas (no se llaman desde el navegador) ─────────────
create or replace function public.add_xp(p_user uuid, p_game text, p_ref text, p_xp int) returns void
language sql security definer set search_path = public as $$
  insert into game_xp (user_id, game, ref, xp) values (p_user, p_game, p_ref, greatest(p_xp, 0))
  on conflict (user_id, game, ref) do update set xp = greatest(game_xp.xp, excluded.xp);
$$;

-- Concede las insignias que aún no tenga y devuelve las nuevas para celebrarlas en pantalla.
create or replace function public.try_badges(p_user uuid, p_slugs text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s text; b game_badges; earned jsonb := '[]'::jsonb; n int;
begin
  foreach s in array coalesce(p_slugs, '{}') loop
    select * into b from game_badges where slug = s;
    if not found then continue; end if;
    insert into user_badges (user_id, slug) values (p_user, s) on conflict do nothing;
    get diagnostics n = row_count;
    if n > 0 then
      if b.points > 0 then perform award(p_user, 'insignia', b.points, s); end if;
      earned := earned || jsonb_build_object('slug', b.slug, 'name', b.name, 'description', b.description, 'icon', b.icon, 'points', b.points);
    end if;
  end loop;
  return earned;
end $$;

revoke all on function public.add_xp(uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.try_badges(uuid, text[]) from public, anon, authenticated;

-- ───────────── Quiz: corrección al momento e insignias ─────────────
create or replace function public.quiz_check(p_question uuid, p_answer int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q quiz_questions;
begin
  if not is_member() then raise exception 'sin acceso'; end if;
  select * into q from quiz_questions where id = p_question and (published or is_staff());
  if not found then raise exception 'pregunta no encontrada'; end if;
  return jsonb_build_object('ok', q.correct = p_answer, 'correct', q.correct, 'explanation', q.explanation);
end $$;

create or replace function public.submit_quiz(p_module uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  qs record; total int := 0; score int := 0; results jsonb := '[]'::jsonb; i int := 0;
  ok boolean; passed boolean; prev quiz_attempts; slugs text[] := '{}'; pending int;
  first_time boolean; new_badges jsonb := '[]'::jsonb;
begin
  if not is_member() then raise exception 'sin acceso'; end if;
  for qs in select * from quiz_questions where module_id = p_module and (published or is_staff()) order by position, created_at loop
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

  first_time := passed and not coalesce(prev.passed, false);
  if passed then perform award(auth.uid(), 'quiz', 20, p_module::text); end if;
  if first_time then
    perform add_xp(auth.uid(), 'quiz', p_module::text, 50);
    slugs := slugs || 'quiz-primero'::text;
    select count(*) into pending
      from modules m join courses c on c.id = m.course_id
      where c.title = 'Venta en Blanco'
        and exists (select 1 from quiz_questions q where q.module_id = m.id and q.published)
        and not exists (select 1 from quiz_attempts a where a.module_id = m.id and a.user_id = auth.uid() and a.passed);
    if pending = 0 then slugs := slugs || 'vb-dominada'::text; end if;
    new_badges := try_badges(auth.uid(), slugs);
  end if;

  return jsonb_build_object('score', score, 'total', total, 'passed', passed, 'results', results,
                            'first_pass', first_time, 'badges', new_badges);
end $$;

-- ───────────── Reto diario ─────────────
-- 3 preguntas al día de los módulos que el alumno ya ha empezado, sin repetir las de las últimas 2 semanas.
create or replace function public.daily_get() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r daily_runs; today date := madrid_today(); picked uuid[]; recent uuid[]; st game_streaks; qs jsonb;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into r from daily_runs where user_id = auth.uid() and day = today;
  if not found then
    select coalesce(array_agg(u), '{}') into recent from (
      select unnest(questions) u from daily_runs where user_id = auth.uid() and day > today - 14
    ) t;
    with started as (
      select distinct l.module_id from lesson_progress lp join lessons l on l.id = lp.lesson_id where lp.user_id = auth.uid()
    ), pool as (
      select q.id, case when q.module_id in (select module_id from started) then 0 else 1 end as rank_
      from quiz_questions q
      join modules m on m.id = q.module_id
      join courses c on c.id = m.course_id
      where (q.published or is_staff()) and (
        q.module_id in (select module_id from started)
        or (c.title = 'Venta en Blanco' and m.position <= 3)   -- sin progreso todavía: los primeros módulos
      )
    )
    select array_agg(id) into picked from (
      select id from pool order by rank_, (id = any(recent)), random() limit 3
    ) t;
    if picked is null or array_length(picked, 1) is null then
      raise exception 'aún no hay preguntas';
    end if;
    insert into daily_runs (user_id, day, questions) values (auth.uid(), today, picked) returning * into r;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options) order by a.ord), '[]'::jsonb)
    into qs
    from unnest(r.questions) with ordinality a(id, ord) join quiz_questions q on q.id = a.id;
  select * into st from game_streaks where user_id = auth.uid();
  return jsonb_build_object('questions', qs, 'answers', to_jsonb(r.answers), 'hits', r.hits, 'finished', r.finished,
    'streak', coalesce(st.current, 0), 'best', coalesce(st.best, 0));
end $$;

create or replace function public.daily_answer(p_answer int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r daily_runs; today date := madrid_today(); q quiz_questions; ok boolean; st game_streaks; xp int := 0;
  new_cur int; slugs text[] := '{}'; badges jsonb := '[]'::jsonb; idx int;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into r from daily_runs where user_id = auth.uid() and day = today for update;
  if not found or r.finished then raise exception 'reto no disponible'; end if;
  idx := coalesce(array_length(r.answers, 1), 0) + 1;
  select * into q from quiz_questions where id = r.questions[idx];
  ok := q.correct = p_answer;
  r.answers := r.answers || p_answer;
  if ok then r.hits := r.hits + 1; end if;
  r.finished := idx >= array_length(r.questions, 1);
  update daily_runs set answers = r.answers, hits = r.hits, finished = r.finished where user_id = r.user_id and day = r.day;

  select * into st from game_streaks where user_id = auth.uid() for update;
  if r.finished then
    new_cur := case when st.last_day = today - 1 then st.current + 1 when st.last_day = today then st.current else 1 end;
    insert into game_streaks (user_id, current, best, last_day) values (auth.uid(), new_cur, new_cur, today)
    on conflict (user_id) do update set current = new_cur, best = greatest(game_streaks.best, new_cur), last_day = today;
    -- La racha premia hacer el reto, no acertarlo: lo que mueve es volver cada día.
    xp := 10 * r.hits + 10 + least(new_cur, 10) * 2;
    perform add_xp(auth.uid(), 'reto', today::text, xp);
    slugs := array['primer-reto'];
    if new_cur >= 7 then slugs := slugs || 'racha-7'::text; end if;
    if new_cur >= 30 then slugs := slugs || 'racha-30'::text; end if;
    if new_cur >= 100 then slugs := slugs || 'racha-100'::text; end if;
    badges := try_badges(auth.uid(), slugs);
  end if;
  return jsonb_build_object('ok', ok, 'correct', q.correct, 'explanation', q.explanation, 'finished', r.finished,
    'hits', r.hits, 'xp', xp, 'streak', coalesce(new_cur, st.current, 0), 'badges', badges);
end $$;

-- ───────────── Juegos rápidos: Ping Pong y Lee al lead ─────────────
create or replace function public.game_item_public(p_id uuid, p_limit int) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'prompt', prompt, 'options', options, 'tag', tag, 'limit', p_limit) from game_items where id = p_id;
$$;
revoke all on function public.game_item_public(uuid, int) from public, anon, authenticated;

create or replace function public.game_start(p_game text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s game_sessions; picked uuid[]; lim int := case p_game when 'ping_pong' then 15 else 9 end;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  if p_game not in ('ping_pong', 'lee') then raise exception 'juego no válido'; end if;
  select array_agg(id) into picked from (select id from game_items where game = p_game and active order by random() limit 12) t;
  if picked is null then raise exception 'aún no hay contenido'; end if;
  insert into game_sessions (user_id, game, items) values (auth.uid(), p_game, picked) returning * into s;
  return jsonb_build_object('session', s.id, 'lives', s.lives, 'total', array_length(picked, 1), 'item', game_item_public(picked[1], lim));
end $$;

create or replace function public.game_answer(p_session uuid, p_answer int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s game_sessions; it game_items; ok boolean; lim int; elapsed numeric; gained int := 0; done boolean;
  total int; xp int := 0; best int; slugs text[] := '{}'; badges jsonb := '[]'::jsonb; today date := madrid_today();
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into s from game_sessions where id = p_session and user_id = auth.uid() and finished_at is null for update;
  if not found then raise exception 'partida no disponible'; end if;
  lim := case s.game when 'ping_pong' then 15 else 9 end;
  total := array_length(s.items, 1);
  select * into it from game_items where id = s.items[s.idx + 1];
  elapsed := extract(epoch from now() - s.last_at);
  -- El reloj lo lleva el servidor. Un segundo y medio de margen por la latencia.
  ok := p_answer = it.correct and elapsed <= lim + 1.5;
  if ok then
    gained := 10 + greatest(0, round(10 * (1 - elapsed / lim)))::int + least(s.combo, 5) * 2;
    s.score := s.score + gained; s.combo := s.combo + 1; s.hits := s.hits + 1;
    s.best_combo := greatest(s.best_combo, s.combo);
  else
    s.lives := s.lives - 1; s.combo := 0;
  end if;
  s.idx := s.idx + 1;
  done := s.lives <= 0 or s.idx >= total;

  update game_sessions set idx = s.idx, lives = s.lives, combo = s.combo, best_combo = s.best_combo,
    score = s.score, hits = s.hits, last_at = now(), finished_at = case when done then now() end
  where id = s.id;

  if done then
    -- Cuenta solo la mejor partida del día y con tope: jugar 40 veces no gana la liga.
    xp := least(s.score, 150);
    perform add_xp(auth.uid(), s.game, today::text, xp);
    select max(g.score) into best from game_sessions g where g.user_id = auth.uid() and g.game = s.game and g.finished_at is not null;
    if s.game = 'ping_pong' then
      if s.best_combo >= 8 then slugs := slugs || 'manos-rapidas'::text; end if;
      if s.idx >= total and s.lives = 3 then slugs := slugs || 'ping-pong-limpio'::text; end if;
    else
      if s.idx >= total and s.lives = 3 then slugs := slugs || 'lector'::text; end if;
    end if;
    badges := try_badges(auth.uid(), slugs);
  end if;

  return jsonb_build_object('ok', ok, 'timeout', elapsed > lim + 1.5, 'correct', it.correct, 'explanation', it.explanation,
    'gained', gained, 'score', s.score, 'lives', s.lives, 'combo', s.combo, 'idx', s.idx, 'done', done,
    'next', case when done then null else game_item_public(s.items[s.idx + 1], lim) end,
    'summary', case when done then jsonb_build_object('score', s.score, 'hits', s.hits, 'total', total, 'best_combo', s.best_combo, 'xp', xp, 'best', best, 'badges', badges) end);
end $$;

-- El siguiente reloj arranca cuando el alumno pulsa «Siguiente», no cuando acaba de leer la explicación.
create or replace function public.game_tick(p_session uuid) returns void
language sql security definer set search_path = public as $$
  update game_sessions set last_at = now() where id = p_session and user_id = auth.uid() and finished_at is null;
$$;

-- ───────────── Ordena la llamada ─────────────
-- Se devuelven barajados y se corrigen comparando el texto: el navegador nunca recibe el orden bueno.
create or replace function public.order_get(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l game_order_levels; shuffled text[]; tries int := 0;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into l from game_order_levels where slug = p_slug and active;
  if not found then raise exception 'nivel no encontrado'; end if;
  loop
    select array_agg(s order by random()) into shuffled from unnest(l.steps) s;
    tries := tries + 1;
    exit when shuffled <> l.steps or tries > 5;
  end loop;
  return jsonb_build_object('slug', l.slug, 'title', l.title, 'intro', l.intro, 'steps', shuffled);
end $$;

create or replace function public.order_submit(p_slug text, p_order text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  l game_order_levels; marks jsonb := '[]'::jsonb; i int; good int := 0; n int; wk text := madrid_week();
  p order_progress; v_attempts int; v_solved boolean; v_perfect boolean; xp int := 0; slugs text[] := '{}';
  badges jsonb := '[]'::jsonb; missing int;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into l from game_order_levels where slug = p_slug and active;
  if not found then raise exception 'nivel no encontrado'; end if;
  n := array_length(l.steps, 1);
  if coalesce(array_length(p_order, 1), 0) <> n then raise exception 'orden incompleto'; end if;
  for i in 1..n loop
    marks := marks || to_jsonb(p_order[i] = l.steps[i]);
    if p_order[i] = l.steps[i] then good := good + 1; end if;
  end loop;
  v_solved := good = n;

  select * into p from order_progress o where o.user_id = auth.uid() and o.slug = p_slug for update;
  v_attempts := case when found and p.week = wk then p.attempts + 1 else 1 end;
  v_perfect := v_solved and v_attempts = 1;

  insert into order_progress (user_id, slug, week, attempts, solved, perfect_ever, solved_ever, updated_at)
  values (auth.uid(), p_slug, wk, v_attempts, v_solved, v_perfect, v_solved, now())
  on conflict (user_id, slug) do update set week = wk, attempts = excluded.attempts,
    solved = (order_progress.week = wk and order_progress.solved) or excluded.solved,
    perfect_ever = order_progress.perfect_ever or excluded.perfect_ever,
    solved_ever = order_progress.solved_ever or excluded.solved_ever,
    updated_at = now();

  if v_solved then
    xp := case when v_attempts = 1 then 30 when v_attempts = 2 then 20 else 10 end;
    perform add_xp(auth.uid(), 'ordena', p_slug || ':' || wk, xp);
    select count(*) into missing from game_order_levels g where g.active
      and not exists (select 1 from order_progress o where o.user_id = auth.uid() and o.slug = g.slug and o.solved_ever);
    if missing = 0 then slugs := slugs || 'arquitecto'::text; end if;
    badges := try_badges(auth.uid(), slugs);
  end if;
  return jsonb_build_object('marks', marks, 'good', good, 'total', n, 'solved', v_solved, 'attempts', v_attempts, 'xp', xp,
    'explanation', case when v_solved then l.explanation end, 'badges', badges);
end $$;

-- ───────────── Simulador de llamada ─────────────
create or replace function public.sim_node_public(p_scenario text, p_node text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p_node,
    'stage', n->'stage',
    'lead', n->'lead',
    'options', (select coalesce(jsonb_agg(o.v->'t' order by o.i), '[]'::jsonb) from jsonb_array_elements(n->'options') with ordinality o(v, i))
  ) from (select nodes->p_node as n from game_scenarios where slug = p_scenario) t;
$$;
revoke all on function public.sim_node_public(text, text) from public, anon, authenticated;

create or replace function public.sim_start(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sc game_scenarios; r sim_runs;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into sc from game_scenarios where slug = p_slug and active;
  if not found then raise exception 'escenario no encontrado'; end if;
  insert into sim_runs (user_id, scenario, node) values (auth.uid(), p_slug, sc.start_node) returning * into r;
  return jsonb_build_object('run', r.id, 'trust', r.trust, 'title', sc.title, 'persona', sc.persona, 'role', sc.role,
    'context', sc.context, 'offer', sc.offer, 'node', sim_node_public(p_slug, sc.start_node));
end $$;

create or replace function public.sim_choose(p_run uuid, p_option int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r sim_runs; sc game_scenarios; n jsonb; o jsonb; nxt text; nx jsonb; d int; ending jsonb; xp int := 0; won boolean := false;
  slugs text[] := '{}'; badges jsonb := '[]'::jsonb; missing int;
begin
  if not entrena_open() then raise exception 'sin acceso'; end if;
  select * into r from sim_runs where id = p_run and user_id = auth.uid() and finished_at is null for update;
  if not found then raise exception 'llamada no disponible'; end if;
  select * into sc from game_scenarios where slug = r.scenario;
  n := sc.nodes->r.node;
  o := n->'options'->p_option;
  if o is null then raise exception 'opción no válida'; end if;
  d := coalesce((o->>'d')::int, 0);
  r.trust := greatest(0, least(100, r.trust + d));
  r.steps := r.steps + 1;
  r.history := r.history || jsonb_build_object('stage', n->'stage', 'lead', n->'lead', 'chose', o->'t', 'd', d, 'fb', o->'fb');

  -- Confianza por los suelos: el lead cuelga, venga lo que venga después.
  nxt := case when r.trust <= 15 then coalesce(sc.nodes->>'__hangup', 'end_colgado') else o->>'next' end;
  nx := sc.nodes->nxt;
  -- Puerta: el final depende de cuánta confianza hayas construido.
  if nx ? 'gate' then
    nxt := case when r.trust >= (nx->>'gate')::int then nx->>'hi' else nx->>'lo' end;
    nx := sc.nodes->nxt;
  end if;

  if nx ? 'end' then
    ending := nx;
    r.result := nx->>'result';
    won := r.result in ('cierre', 'integridad', 'agenda');
    xp := round(r.trust * case when won then 1 else 0.4 end)::int;
    perform add_xp(auth.uid(), 'simulador', r.scenario || ':' || madrid_week(), xp);
    if r.result in ('cierre', 'agenda') then slugs := slugs || 'primer-cierre'::text; end if;
    if r.result = 'integridad' then slugs := slugs || 'ley-de-mama'::text; end if;
    update sim_runs set node = nxt, trust = r.trust, steps = r.steps, history = r.history, result = r.result, finished_at = now() where id = r.id;
    if won then
      select count(*) into missing from game_scenarios g where g.active
        and not exists (select 1 from sim_runs x where x.user_id = auth.uid() and x.scenario = g.slug and x.result in ('cierre', 'integridad', 'agenda'));
      if missing = 0 then slugs := slugs || 'simulador-completo'::text; end if;
    end if;
    badges := try_badges(auth.uid(), slugs);
  else
    update sim_runs set node = nxt, trust = r.trust, steps = r.steps, history = r.history where id = r.id;
  end if;

  return jsonb_build_object('d', d, 'fb', o->'fb', 'trust', r.trust, 'done', ending is not null,
    'next', case when ending is null then sim_node_public(r.scenario, nxt) end,
    'ending', case when ending is not null then jsonb_build_object('result', ending->'result', 'title', ending->'title', 'body', ending->'body', 'lesson', ending->'lesson', 'won', won, 'xp', xp, 'badges', badges, 'history', r.history) end);
end $$;

-- ───────────── Liga: cierre semanal (lo llama el cron) ─────────────
create or replace function public.league_settle() returns int
language plpgsql security definer set search_path = public as $$
declare
  wk text := to_char((now() at time zone 'Europe/Madrid') - interval '7 days', 'IYYY-"W"IW');
  r record; created int := 0; pos int := 0; refname text;
begin
  for r in
    select x.user_id, sum(x.xp)::int as xp from game_xp x join profiles p on p.id = x.user_id
    where x.week = wk and p.active and p.role = 'alumno' group by x.user_id having sum(x.xp) > 0 order by sum(x.xp) desc limit 3
  loop
    pos := pos + 1;
    refname := 'liga:' || wk || ':' || r.user_id;
    if exists (select 1 from notifications where ref = refname) then continue; end if;
    perform try_badges(r.user_id, case when pos = 1 then array['campeon', 'podio'] else array['podio'] end);
    insert into notifications (kind, ref, link, user_id, title, body)
    values ('aviso', refname, '/entrena/liga', r.user_id,
      case when pos = 1 then 'Has ganado la liga de la semana' else 'Has acabado en el podio de la liga' end,
      'Terminaste en el puesto ' || pos || ' con ' || r.xp || ' XP. El lunes empieza otra.');
    created := created + 1;
  end loop;
  return created;
end $$;
revoke all on function public.league_settle() from public, anon, authenticated;
grant execute on function public.league_settle() to service_role;

-- ───────────── Admin: cargar contenido y abrir a alumnos ─────────────
create or replace function public.entrena_load(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb; mod uuid; n_q int := 0; n_i int := 0; n_o int := 0; n_s int := 0; n_b int := 0; pub boolean;
  skipped jsonb := '[]'::jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active) then raise exception 'solo admin'; end if;
  pub := exists (select 1 from app_settings where key = 'entrena_abierto' and value = '1');

  for e in select * from jsonb_array_elements(p->'badges') loop
    insert into game_badges (slug, name, description, icon, points, position)
    values (e->>'slug', e->>'name', e->>'description', e->>'icon', (e->>'points')::int, (e->>'position')::int)
    on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, points = excluded.points, position = excluded.position;
    n_b := n_b + 1;
  end loop;

  for e in select * from jsonb_array_elements(p->'quiz') loop
    select m.id into mod from modules m join courses c on c.id = m.course_id
      where c.title = e->>'course' and m.position = (e->>'module')::int and m.title = e->>'module_title';
    if mod is null then skipped := skipped || to_jsonb(e->>'module_title'); continue; end if;
    insert into quiz_questions (id, module_id, position, question, options, correct, explanation, published)
    values ((e->>'id')::uuid, mod, (e->>'position')::int, e->>'question',
            array(select jsonb_array_elements_text(e->'options')), (e->>'correct')::int, e->>'explanation', pub)
    on conflict (id) do update set module_id = excluded.module_id, position = excluded.position, question = excluded.question,
      options = excluded.options, correct = excluded.correct, explanation = excluded.explanation;
    n_q := n_q + 1;
  end loop;

  for e in select * from jsonb_array_elements(p->'items') loop
    insert into game_items (id, game, tag, prompt, options, correct, explanation)
    values ((e->>'id')::uuid, e->>'game', e->>'tag', e->>'prompt', array(select jsonb_array_elements_text(e->'options')), (e->>'correct')::int, e->>'explanation')
    on conflict (id) do update set game = excluded.game, tag = excluded.tag, prompt = excluded.prompt, options = excluded.options, correct = excluded.correct, explanation = excluded.explanation;
    n_i := n_i + 1;
  end loop;

  for e in select * from jsonb_array_elements(p->'order') loop
    insert into game_order_levels (slug, title, intro, steps, explanation, position)
    values (e->>'slug', e->>'title', e->>'intro', array(select jsonb_array_elements_text(e->'steps')), e->>'explanation', (e->>'position')::int)
    on conflict (slug) do update set title = excluded.title, intro = excluded.intro, steps = excluded.steps, explanation = excluded.explanation, position = excluded.position;
    n_o := n_o + 1;
  end loop;

  for e in select * from jsonb_array_elements(p->'scenarios') loop
    insert into game_scenarios (slug, title, persona, role, difficulty, context, offer, start_node, nodes, position)
    values (e->>'slug', e->>'title', e->>'persona', e->>'role', (e->>'difficulty')::int, e->>'context', e->>'offer', e->>'start', e->'nodes', (e->>'position')::int)
    on conflict (slug) do update set title = excluded.title, persona = excluded.persona, role = excluded.role, difficulty = excluded.difficulty,
      context = excluded.context, offer = excluded.offer, start_node = excluded.start_node, nodes = excluded.nodes, position = excluded.position;
    n_s := n_s + 1;
  end loop;

  return jsonb_build_object('quiz', n_q, 'items', n_i, 'order', n_o, 'scenarios', n_s, 'badges', n_b, 'skipped', skipped);
end $$;

create or replace function public.entrena_publish(p_open boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active) then raise exception 'solo admin'; end if;
  update app_settings set value = case when p_open then '1' else '0' end where key = 'entrena_abierto';
  update quiz_questions set published = p_open where published is distinct from p_open;
end $$;

-- Lo que sí se puede llamar desde la app
do $$
declare f text;
begin
  foreach f in array array[
    'daily_get()', 'daily_answer(int)', 'game_start(text)', 'game_answer(uuid, int)', 'game_tick(uuid)',
    'order_get(text)', 'order_submit(text, text[])', 'sim_start(text)', 'sim_choose(uuid, int)',
    'quiz_check(uuid, int)', 'submit_quiz(uuid, int[])', 'entrena_load(jsonb)', 'entrena_publish(boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

grant execute on function public.entrena_load(jsonb) to service_role;
