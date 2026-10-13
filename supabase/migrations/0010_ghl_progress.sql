-- Progreso importado de GHL (extraído de la ficha de cada miembro en Suscripciones → Estadísticas).
-- ghl_prog_keys: lección o módulo entero (title='') por curso/módulo; module='*' = cualquier módulo del curso.
-- ghl_prog_users: email → claves completadas. Se aplica ya y, al darse de alta un alumno pendiente, por trigger.
create table if not exists public.ghl_prog_keys (i int primary key, course text not null, module text not null, title text not null);
create table if not exists public.ghl_prog_users (email text primary key, ks int[] not null);
alter table public.ghl_prog_keys enable row level security;
alter table public.ghl_prog_users enable row level security;

create or replace function public.apply_ghl_progress(p_user uuid, p_email text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into lesson_progress (user_id, lesson_id, completed_at)
  select distinct p_user, l.id, now()
  from ghl_prog_users g
  cross join lateral unnest(g.ks) as x(i)
  join ghl_prog_keys k on k.i = x.i
  join courses c on c.title = k.course
  join modules m on m.course_id = c.id and (k.module = '*' or m.title = k.module)
  join lessons l on l.module_id = m.id and (k.title = '' or l.title = k.title)
  where g.email = lower(btrim(p_email))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.apply_ghl_progress(uuid, text) from public, anon, authenticated;

create or replace function public.trg_apply_ghl_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then perform apply_ghl_progress(new.id, new.email); end if;
  return new;
end $$;
create or replace trigger profile_private_ghl_progress
  after insert or update of email on public.profile_private
  for each row execute function public.trg_apply_ghl_progress();
