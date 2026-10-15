-- Publicaciones nuevas por canal (contador en Comunidad y en cada pestaña)
create table if not exists public.channel_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);
alter table public.channel_reads enable row level security;
create policy "channel_reads: las mías" on public.channel_reads for select to authenticated using (user_id = auth.uid());
insert into public.channel_reads (user_id, channel_id, seen_at)
select p.id, c.id, now() from public.profiles p cross join public.channels c on conflict do nothing;
create index if not exists posts_channel_created on public.posts (channel_id, created_at desc);

create or replace function public.unread_posts_by_channel()
returns table (channel_id uuid, n int) language sql security definer set search_path = public stable as $$
  select c.id, count(po.id)::int
  from channels c
  join profiles me on me.id = auth.uid()
  left join channel_reads cr on cr.user_id = me.id and cr.channel_id = c.id
  join posts po on po.channel_id = c.id
    and po.author_id is distinct from me.id
    and po.created_at > coalesce(cr.seen_at, me.onboarded_at, me.enrolled_at, now())
    and po.created_at <= now()
  where is_member()
  group by c.id;
$$;

create or replace function public.mark_channel_read(p_channel uuid)
returns void language sql security definer set search_path = public as $$
  insert into channel_reads (user_id, channel_id, seen_at)
  select auth.uid(), p_channel, now() where is_member()
  on conflict (user_id, channel_id) do update set seen_at = now();
$$;
revoke all on function public.unread_posts_by_channel() from public, anon;
revoke all on function public.mark_channel_read(uuid) from public, anon;
grant execute on function public.unread_posts_by_channel() to authenticated;
grant execute on function public.mark_channel_read(uuid) to authenticated;
