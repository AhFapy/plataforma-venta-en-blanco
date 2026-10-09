-- ───────────── Ajustes generales (Rosa, Trustpilot, mentoría) ─────────────
create table public.app_settings (
  key text primary key,
  value text
);
alter table public.app_settings enable row level security;
create policy settings_read on public.app_settings for select using (is_member());
create policy settings_admin on public.app_settings for all using (is_admin()) with check (is_admin());
insert into public.app_settings (key, value) values
  ('rosa_name', 'Rosa'),
  ('rosa_avatar_url', null),
  ('trustpilot_url', 'https://es.trustpilot.com/review/trudsales.com'),
  ('mentoria_points', '500'),
  ('mentoria_url', null)
on conflict do nothing;

-- ───────────── Objetivos con progreso ─────────────
alter table public.profile_private
  add column if not exists objectives_progress int[] not null default '{0,0,0}',
  add column if not exists improvements_progress int[] not null default '{0,0,0}';

-- ───────────── Notificaciones personales (recordatorios de Rosa) ─────────────
alter table public.notifications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('leccion', 'curso', 'directo', 'anuncio', 'aviso', 'recordatorio'));
create unique index if not exists notifications_ref_user on public.notifications (ref, user_id) where ref like 'rosa:%';
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select
  using (is_member() and (user_id is null or user_id = auth.uid() or is_staff()));

-- ───────────── Vistas de clases y grabaciones (métricas) ─────────────
create table public.lesson_views (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create table public.event_views (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.lesson_views enable row level security;
alter table public.event_views enable row level security;
create policy lv_own on public.lesson_views for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
create policy lv_staff on public.lesson_views for select using (is_staff());
create policy ev_own on public.event_views for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
create policy ev_staff on public.event_views for select using (is_staff());

-- ───────────── Misiones (redes, apps): puntos por acciones ─────────────
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'redes' check (category in ('redes', 'apps', 'otros')),
  title text not null,
  description text,
  image_url text,
  link text,
  cta text,
  points int not null default 10 check (points between 0 and 1000),
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.mission_completions (
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mission_id, user_id)
);
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
create policy missions_read on public.missions for select using (is_member() and (active or is_staff()));
create policy missions_staff on public.missions for all using (is_staff()) with check (is_staff());
create policy mc_read on public.mission_completions for select using (user_id = auth.uid() or is_staff());
create policy mc_insert on public.mission_completions for insert with check (
  user_id = auth.uid() and is_member() and exists (select 1 from missions m where m.id = mission_id and m.active)
);

create or replace function public.trg_points_mission() returns trigger
language plpgsql security definer set search_path = public as $$
declare pts int;
begin
  select points into pts from missions where id = new.mission_id;
  if coalesce(pts, 0) > 0 then perform award(new.user_id, 'mision', pts, new.mission_id::text); end if;
  return new;
end $$;
create trigger points_mission after insert on public.mission_completions
  for each row execute function public.trg_points_mission();

insert into public.missions (category, title, description, link, cta, points, position) values
  ('redes', 'Sigue a Javi en Instagram', 'Contenido diario de ventas, mentalidad y casos reales.', 'https://www.instagram.com/javiermarcoventas/', 'Ir a Instagram', 20, 1),
  ('redes', 'Suscríbete al canal de YouTube', 'Clases largas y directos que no salen en redes.', null, 'Ir a YouTube', 20, 2),
  ('apps', 'El Poder de la Anti-Venta', 'El libro de Javi. La base del método que vas a aplicar en la formación.', null, 'Ver el libro', 30, 1);

-- ───────────── Pop-ups programados ─────────────
create table public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  cta_label text,
  link text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.popup_views (
  popup_id uuid not null references public.popups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  clicked boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (popup_id, user_id)
);
alter table public.popups enable row level security;
alter table public.popup_views enable row level security;
create policy popups_read on public.popups for select using (is_member());
create policy popups_staff on public.popups for all using (is_staff()) with check (is_staff());
create policy pv_own on public.popup_views for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
create policy pv_staff on public.popup_views for select using (is_staff());

-- ───────────── Historias de los alumnos (24 h) ─────────────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text check (length(caption) <= 300),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index on public.stories (expires_at);
alter table public.stories enable row level security;
create policy stories_read on public.stories for select using (is_member() and (expires_at > now() or author_id = auth.uid() or is_staff()));
-- El archivo tiene que estar en la carpeta del autor; la URL se construye siempre a partir de media_path
create policy stories_insert on public.stories for insert with check (
  author_id = auth.uid() and is_member()
  and split_part(media_path, '/', 1) = auth.uid()::text and position('..' in media_path) = 0
);
create policy stories_delete on public.stories for delete using (author_id = auth.uid() or is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', true, 31457280, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;
create policy stories_obj_read on storage.objects for select using (bucket_id = 'stories');
create policy stories_obj_write on storage.objects for insert with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy stories_obj_delete on storage.objects for delete using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

-- Imágenes del equipo (pop-ups, misiones, foto de Rosa)
insert into storage.buckets (id, name, public, file_size_limit) values ('media', 'media', true, 5242880) on conflict (id) do nothing;
create policy media_obj_read on storage.objects for select using (bucket_id = 'media');
create policy media_obj_write on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());

-- Permitir borrar la foto de perfil anterior al cambiarla
create policy avatars_delete on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
