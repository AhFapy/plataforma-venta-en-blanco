-- Plataforma Venta en Blanco · esquema inicial
-- Ejecutar en un proyecto de Supabase NUEVO (no el del panel).


-- ───────────── Perfiles ─────────────
create type public.user_role as enum ('alumno', 'mentor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'alumno',
  active boolean not null default true,
  cohort text,                       -- promoción (ej. "2026-10")
  enrolled_at timestamptz not null default now(),
  bio text,
  onboarded_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- Datos privados: solo los ve el propio alumno y el equipo
create table public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  phone text,
  situation text,                    -- onboarding: situación actual
  goal text,                         -- onboarding: objetivo
  weekly_hours int,                  -- onboarding: horas disponibles/semana
  objectives text[] not null default '{}',   -- 3 objetivos
  improvements text[] not null default '{}'  -- 3 puntos a mejorar
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','mentor') and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

-- Crear perfil al dar de alta un usuario en auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, cohort)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'cohort')
  on conflict (id) do nothing;
  insert into profile_private (id, email, phone)
  values (new.id, new.email, new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un alumno no puede cambiarse el rol, el estado ni la promoción
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = service role o SQL editor: se permite todo
  if auth.uid() is not null and not is_admin() then
    new.role := old.role;
    new.active := old.active;
    new.cohort := old.cohort;
    new.enrolled_at := old.enrolled_at;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.protect_private_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then new.email := old.email; end if;
  return new;
end $$;

create trigger private_protect before update on public.profile_private
  for each row execute function public.protect_private_email();

-- ───────────── Formación ─────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.unlock_mode as enum ('libre', 'progreso', 'fecha');

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  unlock_mode public.unlock_mode not null default 'libre',
  unlock_after_days int not null default 0,   -- para 'fecha': días desde la matrícula
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  duration_min int,
  position int not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Vídeo y recursos aparte: solo se leen si la lección está desbloqueada para ese alumno
create table public.lesson_media (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  video_url text,
  resources jsonb not null default '[]'      -- [{label, url}]
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create or replace function public.lesson_unlocked(p_lesson uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  m modules%rowtype; c_pub boolean; l_pub boolean; enrolled timestamptz; prev_id uuid; pending int;
begin
  if is_staff() then return true; end if;
  if not is_member() then return false; end if;
  select mo.* into m from lessons le join modules mo on mo.id = le.module_id where le.id = p_lesson;
  select co.published, le.published into c_pub, l_pub
    from lessons le join modules mo on mo.id = le.module_id join courses co on co.id = mo.course_id where le.id = p_lesson;
  if m.id is null or not c_pub or not l_pub then return false; end if;
  if m.unlock_mode = 'fecha' then
    select enrolled_at into enrolled from profiles where id = auth.uid();
    return enrolled + make_interval(days => m.unlock_after_days) <= now();
  end if;
  if m.unlock_mode = 'progreso' then
    -- módulo anterior del mismo curso que tenga lecciones publicadas
    select mo.id into prev_id from modules mo
      where mo.course_id = m.course_id and (mo.position, mo.id) < (m.position, m.id)
        and exists (select 1 from lessons x where x.module_id = mo.id and x.published)
      order by mo.position desc, mo.id desc limit 1;
    if prev_id is null then return true; end if;
    select count(*) into pending from lessons x
      where x.module_id = prev_id and x.published
        and not exists (select 1 from lesson_progress lp where lp.lesson_id = x.id and lp.user_id = auth.uid());
    return pending = 0;
  end if;
  return true;
end $$;

-- ───────────── Comunidad ─────────────
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  emoji text,
  position int not null default 0,
  staff_only_post boolean not null default false,
  is_wins boolean not null default false,       -- canal de resultados: da más puntos
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 8000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.posts (channel_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.comments (post_id, created_at);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create or replace function public.protect_post_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.pinned := old.pinned; new.channel_id := old.channel_id; new.author_id := old.author_id;
  end if;
  return new;
end $$;

create trigger posts_protect before update on public.posts
  for each row execute function public.protect_post_fields();

-- ───────────── Eventos ─────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_url text,
  recording_url text,
  created_at timestamptz not null default now()
);

create table public.event_attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ───────────── Puntos ─────────────
create table public.point_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,          -- leccion, post, comentario, resultado, asistencia, manual
  points int not null,
  ref text,                    -- id del objeto origen (para no duplicar)
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index on public.point_events (created_at);

create or replace function public.award(p_user uuid, p_kind text, p_points int, p_ref text)
returns void language sql security definer set search_path = public as $$
  insert into point_events (user_id, kind, points, ref) values (p_user, p_kind, p_points, p_ref)
  on conflict (user_id, kind, ref) do nothing;
$$;

create or replace function public.trg_points_lesson() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform award(new.user_id, 'leccion', 10, new.lesson_id::text); return new; end $$;
create trigger points_lesson after insert on public.lesson_progress
  for each row execute function public.trg_points_lesson();

create or replace function public.trg_points_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare wins boolean;
begin
  select is_wins into wins from channels where id = new.channel_id;
  if wins then perform award(new.author_id, 'resultado', 50, new.id::text);
  else perform award(new.author_id, 'post', 3, new.id::text); end if;
  return new;
end $$;
create trigger points_post after insert on public.posts
  for each row execute function public.trg_points_post();

create or replace function public.trg_points_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform award(new.author_id, 'comentario', 1, new.id::text); return new; end $$;
create trigger points_comment after insert on public.comments
  for each row execute function public.trg_points_comment();

-- Si se borra lo que dio puntos, se retiran (evita publicar-borrar en bucle)
create or replace function public.trg_points_revoke() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from point_events where ref = old.id::text and kind = any(tg_argv);
  return old;
end $$;
create trigger points_post_revoke after delete on public.posts
  for each row execute function public.trg_points_revoke('post', 'resultado');
create trigger points_comment_revoke after delete on public.comments
  for each row execute function public.trg_points_revoke('comentario');

create or replace function public.trg_points_attendance_revoke() returns trigger
language plpgsql security definer set search_path = public as $$
begin delete from point_events where user_id = old.user_id and kind = 'asistencia' and ref = old.event_id::text; return old; end $$;
create trigger points_attendance_revoke after delete on public.event_attendance
  for each row execute function public.trg_points_attendance_revoke();

create or replace function public.trg_points_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform award(new.user_id, 'asistencia', 15, new.event_id::text); return new; end $$;
create trigger points_attendance after insert on public.event_attendance
  for each row execute function public.trg_points_attendance();

-- Ranking (total y mes en curso). security_invoker para respetar RLS.
create view public.leaderboard with (security_invoker = true) as
select p.id as user_id, p.full_name, p.avatar_url, p.cohort,
  coalesce(sum(pe.points), 0)::int as points_total,
  coalesce(sum(pe.points) filter (where pe.created_at >= date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'), 0)::int as points_month
from profiles p
left join point_events pe on pe.user_id = p.id
where p.active and p.role = 'alumno'
group by p.id;

-- Lecciones completadas por alumno (agregado: evita el límite de 1000 filas de la API)
create view public.progress_counts with (security_invoker = true) as
select lp.user_id, count(*)::int as done
from lesson_progress lp
join lessons l on l.id = lp.lesson_id and l.published
join modules m on m.id = l.module_id
join courses c on c.id = m.course_id and c.published
group by lp.user_id;

-- ───────────── RLS ─────────────
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.channels enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.events enable row level security;
alter table public.event_attendance enable row level security;
alter table public.point_events enable row level security;

-- perfiles: miembros ven el directorio; cada uno edita el suyo; admin todo
create policy profiles_read on public.profiles for select using (is_member());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all using (is_admin()) with check (is_admin());

create policy private_own_read on public.profile_private for select using (id = auth.uid() or is_staff());
create policy private_own_update on public.profile_private for update using (id = auth.uid()) with check (id = auth.uid());
create policy private_admin on public.profile_private for all using (is_admin()) with check (is_admin());

-- contenido: miembros leen lo publicado; staff gestiona
create policy courses_read on public.courses for select using (is_member() and (published or is_staff()));
create policy courses_staff on public.courses for all using (is_staff()) with check (is_staff());
create policy modules_read on public.modules for select using (
  is_member() and (is_staff() or exists (select 1 from courses c where c.id = course_id and c.published)));
create policy modules_staff on public.modules for all using (is_staff()) with check (is_staff());
create policy lessons_read on public.lessons for select using (
  is_staff() or (is_member() and published and exists (
    select 1 from modules m join courses c on c.id = m.course_id where m.id = module_id and c.published)));

alter table public.lesson_media enable row level security;
create policy media_read on public.lesson_media for select using (lesson_unlocked(lesson_id));
create policy media_staff on public.lesson_media for all using (is_staff()) with check (is_staff());
create policy lessons_staff on public.lessons for all using (is_staff()) with check (is_staff());

create policy progress_own_read on public.lesson_progress for select using (user_id = auth.uid());
create policy progress_own_insert on public.lesson_progress for insert
  with check (user_id = auth.uid() and lesson_unlocked(lesson_id));
create policy progress_own_delete on public.lesson_progress for delete using (user_id = auth.uid());
create policy progress_staff_read on public.lesson_progress for select using (is_staff());

-- comunidad
create policy channels_read on public.channels for select using (is_member());
create policy channels_staff on public.channels for all using (is_staff()) with check (is_staff());

create policy posts_read on public.posts for select using (is_member());
create policy posts_insert on public.posts for insert with check (
  author_id = auth.uid() and is_member() and
  (is_staff() or not (select staff_only_post from channels c where c.id = channel_id))
);
create policy posts_own_update on public.posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete using (author_id = auth.uid() or is_staff());
create policy posts_staff on public.posts for update using (is_staff()) with check (is_staff());

create policy comments_read on public.comments for select using (is_member());
create policy comments_insert on public.comments for insert with check (author_id = auth.uid() and is_member());
create policy comments_delete on public.comments for delete using (author_id = auth.uid() or is_staff());

create policy likes_read on public.post_likes for select using (is_member());
create policy likes_own on public.post_likes for insert with check (user_id = auth.uid() and is_member());
create policy likes_own_del on public.post_likes for delete using (user_id = auth.uid());

-- eventos
create policy events_read on public.events for select using (is_member());
create policy events_staff on public.events for all using (is_staff()) with check (is_staff());
create policy attendance_read on public.event_attendance for select using (user_id = auth.uid() or is_staff());
create policy attendance_staff on public.event_attendance for all using (is_staff()) with check (is_staff());

-- puntos: lectura para miembros (ranking); solo staff añade puntos manuales
create policy points_read on public.point_events for select using (is_member());
create policy points_staff on public.point_events for insert with check (is_staff());

-- Que nadie llame award() directamente desde el cliente
revoke execute on function public.award(uuid, text, int, text) from public, anon, authenticated;

-- ───────────── Datos iniciales ─────────────
insert into public.channels (slug, name, description, emoji, position, staff_only_post, is_wins) values
  ('anuncios', 'Anuncios', 'Novedades del equipo', '📣', 0, true, false),
  ('presentate', 'Preséntate', 'Quién eres y a por qué vienes', '👋', 1, false, false),
  ('general', 'General', 'Dudas, ideas y conversación', '💬', 2, false, false),
  ('resultados', 'Resultados', 'Clientes, cierres e ingresos. Cada resultado suma 50 puntos', '🏆', 3, false, true);

-- Storage para avatares
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
