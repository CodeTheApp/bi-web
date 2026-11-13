-- Organizational metadata is separate from the image's accessibility description.
alter table public.media
  add column if not exists name text not null default '',
  add column if not exists category text not null default '';

alter table public.media
  add constraint media_name_length check (char_length(name) <= 120),
  add constraint media_category_length check (char_length(category) <= 60);
