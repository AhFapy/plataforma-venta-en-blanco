-- Seguimiento de alumnos (CSM) y testimonios.
-- (antes: alter type public.user_role add value 'csm';  — aplicada en una migración aparte)

-- ───── Permisos ─────
-- CSM = Ona. Los admins también ven y editan todo el seguimiento.
create or replace function public.is_csm() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('csm','admin') and active);
$$;

-- ───── Ficha de seguimiento (una por alumno) ─────
create table if not exists public.followups (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  start_date date not null default current_date,
  goals_3m text,                 -- objetivos a 3 meses (onboarding con Javi)
  quick_wins text,               -- quick wins semana 1
  stage_goals text,              -- objetivos de cada etapa
  active_projects int not null default 0 check (active_projects >= 0),
  projects_notes text,
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  interviews int not null default 0 check (interviews >= 0),
  job_applications int not null default 0 check (job_applications >= 0),
  sessions_manual int check (sessions_manual >= 0),          -- si se rellena, sustituye a la asistencia registrada
  at_risk_manual boolean,                                     -- null = automático
  guarantee boolean not null default false,
  testimonial text not null default 'pendiente' check (testimonial in ('pendiente','hecho')),
  offboarding text not null default 'pendiente' check (offboarding in ('pendiente','agendado','hecho')),
  status text not null default 'activo' check (status in ('activo','finalizado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.followups enable row level security;
create policy "seguimiento: CSM lee" on public.followups for select to authenticated using (is_csm());
create policy "seguimiento: CSM crea" on public.followups for insert to authenticated with check (is_csm());
create policy "seguimiento: CSM edita" on public.followups for update to authenticated using (is_csm()) with check (is_csm());

-- Historial de cambios de la ficha (para garantías): se guarda solo, no se puede tocar
create table if not exists public.followup_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  changes jsonb not null
);
create index if not exists followup_log_user on public.followup_log (user_id, changed_at desc);
alter table public.followup_log enable row level security;
create policy "historial: CSM lee" on public.followup_log for select to authenticated using (is_csm());

create or replace function public.trg_followup_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; diff jsonb := '{}'::jsonb; k text;
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'UPDATE' then
    o := to_jsonb(old) - 'updated_at' - 'updated_by' - 'created_at';
    n := to_jsonb(new) - 'updated_at' - 'updated_by' - 'created_at';
    for k in select jsonb_object_keys(n) loop
      if (o -> k) is distinct from (n -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('antes', o -> k, 'ahora', n -> k));
      end if;
    end loop;
    if diff <> '{}'::jsonb then
      insert into followup_log (user_id, changed_by, changes) values (new.user_id, auth.uid(), diff);
    end if;
  end if;
  return new;
end $$;
create or replace trigger followups_log before update on public.followups
  for each row execute function public.trg_followup_log();
create or replace trigger followups_stamp before insert on public.followups
  for each row execute function public.trg_followup_log();

-- ───── Check-ins (registro permanente: no se editan ni se borran) ─────
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage text not null check (stage in ('dias_1_2','semana_2','mes_1','mes_2','mes_3','mes_4','mes_5','mes_6','extra')),
  checkin_date date not null default current_date,
  notes text not null check (length(btrim(notes)) > 0),
  author_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists checkins_user on public.checkins (user_id, checkin_date desc);
alter table public.checkins enable row level security;
create policy "checkins: CSM lee" on public.checkins for select to authenticated using (is_csm());
create policy "checkins: CSM crea" on public.checkins for insert to authenticated with check (is_csm() and author_id = auth.uid());

-- Alta automática en seguimiento de los alumnos nuevos
create or replace function public.trg_followup_new_student() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'alumno' then
    insert into followups (user_id, start_date) values (new.id, coalesce(new.enrolled_at, now())::date)
    on conflict do nothing;
  end if;
  return new;
end $$;
create or replace trigger profiles_followup after insert on public.profiles
  for each row execute function public.trg_followup_new_student();

-- ───── Testimonios ─────
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  kind text not null default 'tangible' check (kind in ('tangible','no_tangible')),
  body text not null check (length(btrim(body)) between 1 and 4000),
  status text not null default 'borrador' check (status in ('borrador','enviado','publicado')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null
);
alter table public.testimonials enable row level security;
create policy "testimonios: el mío, los publicados o CSM" on public.testimonials for select to authenticated
  using (user_id = auth.uid() or is_csm() or (status = 'publicado' and is_member()));
create policy "testimonios: escribo el mío" on public.testimonials for insert to authenticated
  with check (user_id = auth.uid() and is_member() and status in ('borrador','enviado'));
create policy "testimonios: edito el mío sin publicar" on public.testimonials for update to authenticated
  using (user_id = auth.uid() and status <> 'publicado')
  with check (user_id = auth.uid() and status in ('borrador','enviado'));
create policy "testimonios: CSM modera" on public.testimonials for update to authenticated
  using (is_csm()) with check (is_csm());

create or replace function public.trg_testimonial_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- Solo la CSM toca la nota de revisión y la publicación
  if not is_csm() then
    new.review_note := case when tg_op = 'UPDATE' then old.review_note else null end;
    new.published_at := case when tg_op = 'UPDATE' then old.published_at else null end;
    new.published_by := case when tg_op = 'UPDATE' then old.published_by else null end;
  end if;
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') then
    new.published_at := now(); new.published_by := auth.uid();
    update followups set testimonial = 'hecho' where user_id = new.user_id;
  end if;
  if new.status <> 'publicado' then new.published_at := null; new.published_by := null; end if;
  return new;
end $$;
create or replace trigger testimonials_stamp before insert or update on public.testimonials
  for each row execute function public.trg_testimonial_stamp();

-- ───── Vista general para la CSM ─────
-- Mes 1..6 desde start_date; progreso sobre el curso Venta en Blanco; riesgo automático + manual.
create or replace function public.followup_overview()
returns table (
  user_id uuid, full_name text, avatar_url text, email text, phone text,
  start_date date, month int, status text,
  progress_pct int, sessions int, applications int, active_projects int, interviews int, revenue numeric,
  last_seen_at timestamptz, inactive_days int,
  at_risk_auto boolean, at_risk_manual boolean, at_risk boolean, risk_reason text,
  guarantee boolean, testimonial text, offboarding text,
  last_checkin date, done_stages text[]
) language sql stable security definer set search_path = public as $$
  with vb as (
    select l.id from lessons l join modules m on m.id = l.module_id join courses c on c.id = m.course_id
    where c.title = 'Venta en Blanco' and l.published
  ), base as (
    select f.*, p.full_name, p.avatar_url, p.last_seen_at, pp.email, pp.phone,
      least(6, greatest(1, ((current_date - f.start_date) / 30) + 1))::int as month,
      (select count(*) from lesson_progress lp where lp.user_id = f.user_id and lp.lesson_id in (select id from vb))::numeric
        / nullif((select count(*) from vb), 0) as prog,
      coalesce(f.sessions_manual, (select count(*) from event_attendance ea where ea.user_id = f.user_id)::int) as sess
    from followups f
    join profiles p on p.id = f.user_id
    left join profile_private pp on pp.id = f.user_id
    where is_csm()
  ), r as (
    select b.*,
      case
        when b.status <> 'activo' then null
        when b.month = 1 then nullif(concat_ws(', ',
          case when coalesce(b.prog, 0) < 1.0/3 then 'menos de 1/3 del curso' end,
          case when b.sess = 0 then 'ninguna sesión de grupo' end,
          case when b.job_applications = 0 then 'ninguna aplicación' end), '')
        when b.month = 2 and b.active_projects = 0 and b.interviews = 0 then 'sin proyecto ni entrevistas'
      end as reason
    from base b
  )
  select r.user_id, r.full_name, r.avatar_url, r.email, r.phone,
    r.start_date, r.month, r.status,
    round(coalesce(r.prog, 0) * 100)::int, r.sess, r.job_applications, r.active_projects, r.interviews, r.revenue,
    r.last_seen_at,
    (current_date - coalesce(r.last_seen_at::date, r.start_date))::int,
    r.reason is not null, r.at_risk_manual, coalesce(r.at_risk_manual, r.reason is not null),
    r.reason,  -- motivo automático (aunque Ona lo haya cambiado a mano)
    r.guarantee, r.testimonial, r.offboarding,
    (select max(c.checkin_date) from checkins c where c.user_id = r.user_id),
    coalesce((select array_agg(distinct c.stage) from checkins c where c.user_id = r.user_id), '{}')
  from r
  order by r.start_date desc;
$$;
revoke all on function public.followup_overview() from public, anon;
grant execute on function public.followup_overview() to authenticated;
revoke all on function public.is_csm() from public, anon;
grant execute on function public.is_csm() to authenticated;

-- La CSM lee las respuestas de onboarding y la asistencia a directos
create policy "private: CSM lee" on public.profile_private for select to authenticated using (is_csm());
create policy "asistencia: CSM lee" on public.event_attendance for select to authenticated using (is_csm());
