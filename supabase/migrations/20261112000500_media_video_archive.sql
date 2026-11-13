alter table public.media add column if not exists kind text not null default 'image' check (kind in ('image','video'));
alter table public.media add column if not exists mime_type text;
alter table public.media add column if not exists archived boolean not null default false;
create index if not exists media_active_created on public.media (archived, created_at desc);
