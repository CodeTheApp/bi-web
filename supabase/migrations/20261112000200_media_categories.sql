-- Categories exist independently from images, including categories that are still empty.
create or replace function public.media_category_key(value text) returns text
language sql immutable strict parallel safe set search_path = public as $$
  select lower(btrim(regexp_replace(
    regexp_replace(normalize(value, NFD), U&'[\0300-\036f]', '', 'g'),
    '[[:space:]]+', ' ', 'g'
  )));
$$;

create table public.media_categories (
  key text primary key,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  constraint media_category_key_matches check (key <> '' and key = public.media_category_key(name))
);

insert into public.media_categories (key, name) values
  ('residencial', 'Residencial'),
  ('comercial', 'Comercial'),
  ('equipe', 'Equipe'),
  ('luminarias', 'Luminárias'),
  ('detalhes arquitetonicos', 'Detalhes arquitetônicos');

-- Preserve categories already assigned before the registry was introduced.
-- Default names win when an existing spelling differs only by accents or case.
insert into public.media_categories (key, name)
select distinct on (public.media_category_key(category))
  public.media_category_key(category), btrim(regexp_replace(category, '[[:space:]]+', ' ', 'g'))
from public.media
where public.media_category_key(category) <> ''
order by public.media_category_key(category), category
on conflict (key) do nothing;

update public.media m
set category = c.name
from public.media_categories c
where public.media_category_key(m.category) = c.key and m.category <> c.name;

-- Classify the existing site photography without replacing a chosen category.
with image_files as (
  select id, lower(substring(split_part(split_part(url, '?', 1), '#', 1) from '/img/([^/]+)\.[^.]+$')) as filename
  from public.media
  where public.media_category_key(category) = ''
), assignments as (
  select id, case
    when filename = 'hero' or filename like 'apt-%' then 'Residencial'
    when filename = 'bento' or filename like 'bento-%' or filename = 'vip' or filename like 'vip-%' then 'Comercial'
    when filename = 'camila' then 'Equipe'
    when filename = 'pendentes' or filename like 'prod-%' then 'Luminárias'
    when filename = 'escada' then 'Detalhes arquitetônicos'
  end as category
  from image_files
)
update public.media m
set category = assignments.category
from assignments
where m.id = assignments.id and assignments.category is not null;

alter table public.media_categories enable row level security;
grant select, insert, update, delete on public.media_categories to authenticated;
revoke all on public.media_categories from anon;
create policy "equipe gerencia categorias de mídia" on public.media_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Keep stored values canonical even if a staff client sends an older spelling.
create or replace function public.validate_media_category() returns trigger
language plpgsql set search_path = public as $$
declare
  category_key text := public.media_category_key(new.category);
  category_name text;
begin
  if category_key = '' then
    new.category := '';
    return new;
  end if;
  select name into category_name from public.media_categories where key = category_key;
  if not found then
    raise exception 'Escolha uma categoria existente na biblioteca.' using errcode = '23514';
  end if;
  new.category := category_name;
  return new;
end;
$$;

create trigger media_category_registered
  before insert or update of category on public.media
  for each row execute function public.validate_media_category();
