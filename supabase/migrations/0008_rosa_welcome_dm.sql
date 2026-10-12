-- Mensaje privado de bienvenida de Rosa, 2 minutos después de completar el perfil.
-- Los mensajes con created_at en el futuro no se ven hasta su hora.

create or replace function public.dm_participant(p_conv uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from conversations c where c.id = p_conv and auth.uid() in (c.user_a, c.user_b));
$$;
create or replace function public.dm_has_visible(p_conv uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from messages m where m.conversation_id = p_conv and m.created_at <= now());
$$;
alter policy "msg: participantes" on public.messages using (created_at <= now() and dm_participant(conversation_id));
alter policy "conv: participantes" on public.conversations using (auth.uid() in (user_a, user_b) and dm_has_visible(id));

create or replace function public.unread_dm_count()
returns int language sql security definer set search_path = public stable as $$
  select count(*)::int from messages m join conversations c on c.id = m.conversation_id
  where auth.uid() in (c.user_a, c.user_b) and m.sender_id <> auth.uid() and m.read_at is null and m.created_at <= now();
$$;

create or replace function public.rosa_welcome_dm() returns trigger
language plpgsql security definer set search_path = public as $$
declare rosa uuid; conv uuid; at timestamptz := now() + interval '2 minutes'; nombre text;
begin
  if old.onboarded_at is not null or new.onboarded_at is null or new.role <> 'alumno' then return new; end if;
  select value::uuid into rosa from app_settings where key = 'rosa_profile_id';
  if rosa is null or rosa = new.id then return new; end if;
  nombre := nullif(split_part(btrim(coalesce(new.full_name, '')), ' ', 1), '');
  insert into conversations (user_a, user_b, last_message_at) values (least(rosa, new.id), greatest(rosa, new.id), at)
    on conflict (user_a, user_b) do update set last_message_at = greatest(conversations.last_message_at, excluded.last_message_at)
    returning id into conv;
  insert into messages (conversation_id, sender_id, body, created_at)
  values (conv, rosa, 'Hola' || coalesce(' ' || nombre, '') || '!! 💚' || E'\n\n' || 'Soy Rosa del equipo de Trud, cualquier cosa que necesites con la nueva plataforma me puedes escribir', at);
  return new;
end $$;

create or replace trigger profiles_rosa_welcome after update of onboarded_at on public.profiles
  for each row execute function public.rosa_welcome_dm();
