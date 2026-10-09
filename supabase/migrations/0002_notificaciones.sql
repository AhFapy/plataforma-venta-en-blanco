-- Novedades / notificaciones
alter table public.profiles add column if not exists notifications_seen_at timestamptz not null default now();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('leccion', 'curso', 'directo', 'anuncio', 'aviso')),
  title text not null,
  body text,
  link text,
  ref text,
  count int not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.notifications (created_at desc);

alter table public.notifications enable row level security;
create policy notifications_read on public.notifications for select using (is_member());
create policy notifications_staff on public.notifications for all using (is_staff()) with check (is_staff());

-- Clases: agrupa las subidas del mismo módulo en 12 h para no saturar
create or replace function public.notify_lesson() returns trigger
language plpgsql security definer set search_path = public as $$
declare c_pub boolean; c_title text; m_title text; c_id uuid; existing uuid; is_update boolean;
begin
  if not new.published then return new; end if;
  is_update := tg_op = 'UPDATE' and old.published;
  if is_update and new.updated_at = old.updated_at then return new; end if;
  select co.published, co.title, mo.title, co.id into c_pub, c_title, m_title, c_id
    from modules mo join courses co on co.id = mo.course_id where mo.id = new.module_id;
  if not coalesce(c_pub, false) then return new; end if;
  select id into existing from notifications
    where kind = 'leccion' and ref = new.module_id::text and created_at > now() - interval '12 hours'
    order by created_at desc limit 1;
  if existing is not null then
    update notifications
      set count = count + 1, title = (count + 1) || ' clases nuevas en ' || m_title,
          body = c_title, link = '/formacion/' || c_id, created_at = now()
      where id = existing;
  else
    insert into notifications (kind, title, body, link, ref)
    values ('leccion', case when is_update then 'Clase actualizada: ' else 'Nueva clase: ' end || new.title,
            c_title || ' · ' || m_title, '/formacion/leccion/' || new.id, new.module_id::text);
  end if;
  return new;
end $$;
create trigger lessons_notify after insert or update on public.lessons
  for each row execute function public.notify_lesson();

create or replace function public.notify_course() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    insert into notifications (kind, title, body, link, ref)
    values ('curso', 'Nuevo curso: ' || new.title, new.description, '/formacion/' || new.id, 'curso:' || new.id);
  end if;
  return new;
end $$;
create trigger courses_notify after insert or update on public.courses
  for each row execute function public.notify_course();

create or replace function public.notify_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (kind, title, body, link, ref)
    values ('directo', 'Nuevo directo: ' || new.title,
            to_char(new.starts_at at time zone 'Europe/Madrid', 'DD/MM "a las" HH24:MI') || ' (hora España)',
            '/eventos', 'evento:' || new.id);
  elsif new.recording_url is not null and old.recording_url is null then
    insert into notifications (kind, title, body, link, ref)
    values ('directo', 'Grabación disponible: ' || new.title, null, '/eventos', 'grabacion:' || new.id);
  end if;
  return new;
end $$;
create trigger events_notify after insert or update on public.events
  for each row execute function public.notify_event();

create or replace function public.notify_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from notifications where ref = 'post:' || old.id;
    return old;
  end if;
  if exists (select 1 from channels where id = new.channel_id and staff_only_post) then
    insert into notifications (kind, title, body, link, ref, created_by)
    values ('anuncio', 'Nuevo anuncio', left(new.body, 400), '/comunidad/post/' || new.id, 'post:' || new.id, new.author_id);
  end if;
  return new;
end $$;
create trigger posts_notify after insert or delete on public.posts
  for each row execute function public.notify_post();
