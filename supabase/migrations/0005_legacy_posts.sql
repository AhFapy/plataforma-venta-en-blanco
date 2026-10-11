-- Posts y comentarios migrados de la comunidad de GHL.
-- Se guardan sin cuenta (author_id null) y con el nombre/foto del autor original;
-- más adelante se emparejan con su perfil por contactId -> email.

alter table posts alter column author_id drop not null;
alter table posts add column if not exists legacy_author jsonb;          -- {name, avatar, contact_id}
alter table posts add column if not exists media jsonb not null default '[]'::jsonb; -- [{url,type,name,width,height}]
alter table posts add column if not exists legacy_likes int not null default 0;
alter table posts add column if not exists ghl_id text unique;

alter table comments alter column author_id drop not null;
alter table comments add column if not exists legacy_author jsonb;
alter table comments add column if not exists media jsonb not null default '[]'::jsonb;
alter table comments add column if not exists ghl_id text unique;

alter table posts add constraint posts_author_or_legacy check (author_id is not null or legacy_author is not null);
alter table comments add constraint comments_author_or_legacy check (author_id is not null or legacy_author is not null);

-- Lo importado no notifica ni da puntos.
create or replace function public.notify_post()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if tg_op = 'DELETE' then
    delete from notifications where ref = 'post:' || old.id;
    return old;
  end if;
  if new.ghl_id is not null or new.author_id is null then return new; end if;
  if exists (select 1 from channels where id = new.channel_id and staff_only_post) then
    insert into notifications (kind, title, body, link, ref, created_by)
    values ('anuncio', 'Nuevo anuncio', left(new.body, 400), '/comunidad/post/' || new.id, 'post:' || new.id, new.author_id);
  end if;
  return new;
end $function$;

create or replace function public.trg_points_post()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare wins boolean;
begin
  if new.ghl_id is not null or new.author_id is null then return new; end if;
  select is_wins into wins from channels where id = new.channel_id;
  if wins then perform award(new.author_id, 'resultado', 50, new.id::text);
  else perform award(new.author_id, 'post', 3, new.id::text); end if;
  return new;
end $function$;

create or replace function public.trg_points_comment()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.ghl_id is not null or new.author_id is null then return new; end if;
  perform award(new.author_id, 'comentario', 1, new.id::text);
  return new;
end $function$;

insert into channels (slug, name, description, emoji, position, staff_only_post, is_wins) values
  ('bolsa-de-trabajo', 'Bolsa de trabajo', 'Ofertas y oportunidades comerciales', '💼', 4, false, false),
  ('pildoras', 'Píldoras', 'Contenido corto del equipo', '💊', 5, true, false)
on conflict (slug) do nothing;
