-- Brasília Iluminação — esquema inicial
-- Conteúdo do site, projetos, mídia, mensagens e perfis do painel, com Row Level Security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Perfis do painel (1:1 com auth.users)
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------
create table public.sections (
  key text primary key,
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  position int not null default 0,
  status text not null default 'publicado' check (status in ('rascunho', 'publicado')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  s3_key text,
  width int,
  height int,
  alt text not null default '',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'Residencial',
  location text not null default '',
  year text not null default '',
  summary text not null default '',
  scope text[] not null default '{}',
  cover_url text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  position int not null default 0,
  seo jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  media_id uuid references public.media (id) on delete set null,
  url text not null,
  alt text not null default '',
  layout text not null default 'faixa' check (layout in ('cheia', 'par', 'faixa')),
  position int not null default 0
);
create index on public.project_images (project_id, position);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text not null default '',
  location text not null default '',
  position int not null default 0,
  visible boolean not null default true
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null default '',
  position int not null default 0,
  visible boolean not null default true
);

-- ---------------------------------------------------------------
-- Mensagens (formulário + e-mails recebidos)
-- ---------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  city text not null default '',
  interest text not null default '',
  source text not null default 'formulario' check (source in ('formulario', 'email')),
  status text not null default 'novo' check (status in ('novo', 'andamento', 'respondido', 'arquivado')),
  unread boolean not null default true,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.threads (status, last_message_at desc);
create index on public.threads (contact_email);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  from_email text not null default '',
  to_email text not null default '',
  body_text text not null default '',
  body_html text,
  provider_id text,
  message_id_header text,
  delivery text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.messages (thread_id, created_at);
create index on public.messages (message_id_header);

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id),
  action text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.settings enable row level security;
alter table public.media enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.audit_log enable row level security;

-- Público: só o que está publicado/visível
create policy "público lê seções" on public.sections for select to anon using (true);
create policy "público lê configurações" on public.settings for select to anon using (true);
create policy "público lê mídia" on public.media for select to anon using (true);
create policy "público lê projetos publicados" on public.projects for select to anon using (status = 'publicado');
create policy "público lê fotos de projetos publicados" on public.project_images for select to anon
  using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'publicado'));
create policy "público lê depoimentos visíveis" on public.testimonials for select to anon using (visible);
create policy "público lê perguntas visíveis" on public.faqs for select to anon using (visible);

-- O público só enxerga a versão publicada das seções (o rascunho fica escondido)
revoke select on public.sections from anon;
grant select (key, published, position) on public.sections to anon;

-- Equipe do painel: tudo no conteúdo e nas mensagens
create policy "equipe gerencia seções" on public.sections for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia mídia" on public.media for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia projetos" on public.projects for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia fotos" on public.project_images for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia depoimentos" on public.testimonials for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia perguntas" on public.faqs for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia conversas" on public.threads for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia mensagens" on public.messages for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe registra atividade" on public.audit_log for insert to authenticated with check (public.is_staff());
create policy "equipe lê atividade" on public.audit_log for select to authenticated using (public.is_staff());

-- Configurações e usuários: só admin altera
create policy "equipe lê configurações" on public.settings for select to authenticated using (public.is_staff());
create policy "admin altera configurações" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "equipe lê perfis" on public.profiles for select to authenticated using (public.is_staff());
create policy "admin gerencia perfis" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tempo real: avisa o painel quando chega mensagem nova
alter publication supabase_realtime add table public.threads;
