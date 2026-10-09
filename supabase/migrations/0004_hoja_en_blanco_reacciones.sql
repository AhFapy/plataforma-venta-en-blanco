-- ───────────── Reacciones con emoji ─────────────
create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '👏', '💪', '🙌', '😂', '🤯')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);
alter table public.post_reactions enable row level security;
create policy pr_read on public.post_reactions for select using (is_member());
create policy pr_insert on public.post_reactions for insert with check (user_id = auth.uid() and is_member());
create policy pr_delete on public.post_reactions for delete using (user_id = auth.uid());

-- ───────────── Deberes entregados en cada clase ─────────────
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  body text check (length(body) <= 20000),
  file_path text,
  file_name text,
  feedback text,
  feedback_by uuid references public.profiles(id) on delete set null,
  feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
alter table public.submissions enable row level security;
create policy sub_own_read on public.submissions for select using (user_id = auth.uid() or is_staff());
create policy sub_own_insert on public.submissions for insert with check (
  user_id = auth.uid() and lesson_unlocked(lesson_id)
  and (file_path is null or split_part(file_path, '/', 1) = auth.uid()::text)
);
create policy sub_own_update on public.submissions for update using (user_id = auth.uid()) with check (
  user_id = auth.uid() and (file_path is null or split_part(file_path, '/', 1) = auth.uid()::text)
);
create policy sub_own_delete on public.submissions for delete using (user_id = auth.uid());
create policy sub_staff on public.submissions for update using (is_staff()) with check (is_staff());

-- El alumno no puede escribirse el feedback del equipo
create or replace function public.protect_submission_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.feedback := old.feedback; new.feedback_by := old.feedback_by; new.feedback_at := old.feedback_at;
  end if;
  return new;
end $$;
create trigger submissions_protect before update on public.submissions
  for each row execute function public.protect_submission_feedback();

-- Bucket privado: solo el alumno y el equipo pueden abrir los archivos
insert into storage.buckets (id, name, public, file_size_limit)
values ('deberes', 'deberes', false, 26214400) on conflict (id) do nothing;
create policy deberes_read on storage.objects for select using (bucket_id = 'deberes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy deberes_write on storage.objects for insert with check (bucket_id = 'deberes' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy deberes_delete on storage.objects for delete using (bucket_id = 'deberes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────── Biblioteca de recursos (los pone el equipo) ─────────────
create table public.library_resources (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'General',
  title text not null,
  description text,
  url text,
  file_path text,
  file_name text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check (url is not null or file_path is not null)
);
alter table public.library_resources enable row level security;
create policy lib_read on public.library_resources for select using (is_member());
create policy lib_staff on public.library_resources for all using (is_staff()) with check (is_staff());

-- Archivos de la biblioteca: privados, solo alumnos con acceso los abren (URL firmada)
insert into storage.buckets (id, name, public, file_size_limit)
values ('recursos', 'recursos', false, 52428800) on conflict (id) do nothing;
create policy recursos_read on storage.objects for select using (bucket_id = 'recursos' and public.is_member());
create policy recursos_write on storage.objects for insert with check (bucket_id = 'recursos' and public.is_staff());
create policy recursos_delete on storage.objects for delete using (bucket_id = 'recursos' and public.is_staff());

-- ───────────── Notas personales con carpetas ─────────────
create table public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid references public.note_folders(id) on delete set null,
  title text not null default '' check (length(title) <= 140),
  body text not null default '' check (length(body) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.notes (user_id, updated_at desc);
alter table public.note_folders enable row level security;
alter table public.notes enable row level security;
-- Notas privadas: ni el equipo las lee
create policy folders_own on public.note_folders for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_member());
create policy notes_own on public.notes for all using (user_id = auth.uid()) with check (
  user_id = auth.uid() and is_member()
  and (folder_id is null or exists (select 1 from note_folders f where f.id = folder_id and f.user_id = auth.uid()))
);
