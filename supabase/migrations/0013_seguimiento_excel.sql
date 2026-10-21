-- Funciones del Excel de seguimiento de Ona: onboarding con Javi, notas, objetivo (fecha y cumplido),
-- eventos presenciales con asistencia y resumen mensual (se calcula en la app).
alter table public.followups
  add column if not exists onboarding_done boolean not null default false,
  add column if not exists notes text,
  add column if not exists objective_due date,
  add column if not exists objective_met boolean not null default false,
  add column if not exists objective_met_at date;

create or replace function public.trg_followup_objective() returns trigger
language plpgsql as $$
begin
  if new.objective_met and (tg_op = 'INSERT' or not old.objective_met) then new.objective_met_at := coalesce(new.objective_met_at, current_date); end if;
  if not new.objective_met then new.objective_met_at := null; end if;
  return new;
end $$;
create or replace trigger followups_objective before insert or update of objective_met on public.followups
  for each row execute function public.trg_followup_objective();

create table if not exists public.csm_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  event_date date,
  created_at timestamptz not null default now()
);
create table if not exists public.csm_event_attendance (
  event_id uuid not null references public.csm_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  marked_by uuid references public.profiles(id) on delete set null default auth.uid(),
  primary key (event_id, user_id)
);
alter table public.csm_events enable row level security;
alter table public.csm_event_attendance enable row level security;
create policy "eventos presenciales: CSM" on public.csm_events for all to authenticated using (is_csm()) with check (is_csm());
create policy "asistencia presencial: CSM" on public.csm_event_attendance for all to authenticated using (is_csm()) with check (is_csm());
