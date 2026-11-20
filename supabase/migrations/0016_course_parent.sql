-- Formaciones dentro de otra formación (p. ej. la tarjeta Bonus con Sistemas + IA y Setting dentro)
alter table public.courses add column if not exists parent_id uuid references public.courses(id) on delete set null;
create index if not exists courses_parent_id_idx on public.courses(parent_id);

-- Datos: separa la tarjeta Bonus en dos formaciones hijas (Sistemas + IA y Setting)
do $$
declare b uuid; s uuid; t uuid;
begin
  select id into b from public.courses where title = 'Bonus' and parent_id is null limit 1;
  if b is null or exists (select 1 from public.courses where parent_id = b) then return; end if;
  insert into public.courses (title, description, cover_url, position, published, parent_id)
    values ('Sistemas + IA aplicadas a las ventas', 'KPIs, CRM, métricas, Manychat y GoHighLevel para vender más siendo más eficiente.', '/portada-sistemas-ia.jpg', 1, true, b) returning id into s;
  insert into public.courses (title, description, cover_url, position, published, parent_id)
    values ('Formación de Setting', 'La formación completa de setting.', '/portada-setting.jpg', 2, true, b) returning id into t;
  update public.modules set course_id = s, title = substr(title, length('Sistemas + IA · ') + 1) where course_id = b and title like 'Sistemas + IA · %';
  update public.modules set course_id = t, title = substr(title, length('Setting · ') + 1), position = position - 6 where course_id = b and title like 'Setting · %';
end $$;
