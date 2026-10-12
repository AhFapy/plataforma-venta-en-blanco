-- Historias: quién las ha visto y corazones. Mensajes privados 1 a 1.

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
alter table public.story_views enable row level security;
alter table public.story_likes enable row level security;

create or replace function public.is_story_owner(p_story uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from stories where id = p_story and author_id = auth.uid());
$$;

create policy "views: las mías o las de mis historias" on public.story_views for select to authenticated
  using (user_id = auth.uid() or is_story_owner(story_id));
create policy "views: registro la mía" on public.story_views for insert to authenticated
  with check (user_id = auth.uid() and is_member());
create policy "views: actualizo la mía" on public.story_views for update to authenticated
  using (user_id = auth.uid());

create policy "likes historia: los míos o los de mis historias" on public.story_likes for select to authenticated
  using (user_id = auth.uid() or is_story_owner(story_id));
create policy "likes historia: doy el mío" on public.story_likes for insert to authenticated
  with check (user_id = auth.uid() and is_member());
create policy "likes historia: quito el mío" on public.story_likes for delete to authenticated
  using (user_id = auth.uid());

-- ───── Mensajes privados ─────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  story_media_url text,
  story_media_type text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conv on public.messages (conversation_id, created_at);
create index if not exists conversations_a on public.conversations (user_a, last_message_at desc);
create index if not exists conversations_b on public.conversations (user_b, last_message_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conv: participantes" on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy "msg: participantes" on public.messages for select to authenticated
  using (exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

-- Enviar: crea la conversación si hace falta. Opcionalmente responde a una historia.
create or replace function public.send_dm(p_to uuid, p_body text, p_story uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; conv uuid; murl text; mtype text; txt text := btrim(coalesce(p_body, ''));
begin
  if not is_member() then raise exception 'sin acceso'; end if;
  if p_to is null or p_to = me then raise exception 'destinatario no válido'; end if;
  if not exists (select 1 from profiles where id = p_to and active) then raise exception 'destinatario no válido'; end if;
  if txt = '' or length(txt) > 4000 then raise exception 'mensaje vacío o demasiado largo'; end if;
  if p_story is not null then
    select media_url, media_type into murl, mtype from stories where id = p_story and author_id = p_to;
  end if;
  a := least(me, p_to); b := greatest(me, p_to);
  insert into conversations (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do update set last_message_at = now()
    returning id into conv;
  insert into messages (conversation_id, sender_id, body, story_media_url, story_media_type)
    values (conv, me, txt, murl, mtype);
  return conv;
end $$;

create or replace function public.mark_conversation_read(p_conv uuid)
returns void language sql security definer set search_path = public as $$
  update messages m set read_at = now()
  from conversations c
  where m.conversation_id = p_conv and c.id = p_conv and auth.uid() in (c.user_a, c.user_b)
    and m.sender_id <> auth.uid() and m.read_at is null;
$$;

create or replace function public.unread_dm_count()
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from messages m join conversations c on c.id = m.conversation_id
  where auth.uid() in (c.user_a, c.user_b) and m.sender_id <> auth.uid() and m.read_at is null;
$$;

revoke all on function public.send_dm(uuid, text, uuid) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.unread_dm_count() from public, anon;
grant execute on function public.send_dm(uuid, text, uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.unread_dm_count() to authenticated;
