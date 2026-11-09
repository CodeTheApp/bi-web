-- Brasília Iluminação — loja, fase 1: catálogo e estoque
-- Produtos com variantes (acabamento, tamanho, versão), ficha técnica, fotos e movimentos de estoque.
-- Pagamento, frete e nota fiscal entram nas próximas fases, em tabelas próprias.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  description text not null default '',
  specs jsonb not null default '{}'::jsonb,      -- ficha técnica: { "potencia": "12 W", ... }
  options text[] not null default '{}',           -- tipos de opção usados, na ordem: {acabamento,tamanho}
  legacy jsonb not null default '{}'::jsonb,      -- nomes e chave da planilha antiga (só o painel vê)
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products (status, category);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  options jsonb not null default '{}'::jsonb,     -- { "acabamento": "Preto", "tamanho": "Ø 42 cm" }
  price_cents int check (price_cents >= 0),       -- null = sob consulta
  compare_at_cents int check (compare_at_cents >= 0),
  stock_policy text not null default 'encomenda' check (stock_policy in ('estoque', 'encomenda')),
  lead_time_days int check (lead_time_days between 0 and 365),
  stock_on_hand int not null default 0,           -- só muda por stock_movements (gatilho abaixo)
  in_stock boolean generated always as (stock_on_hand > 0) stored,
  active boolean not null default true,
  legacy_name text not null default '',
  position int not null default 0
);
create index on public.product_variants (product_id, position);

-- Fotos e vídeos (link do YouTube/Vimeo ou arquivo). Ocultos ficam guardados no painel e não aparecem na loja.
create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  kind text not null default 'imagem' check (kind in ('imagem', 'video')),
  url text not null,
  alt text not null default '',
  visible boolean not null default true,
  position int not null default 0
);
create index on public.product_media (product_id, position);

-- Estoque é um livro-razão: cada entrada, venda ou ajuste vira uma linha, e o saldo da variante acompanha.
create table public.stock_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('inicial', 'compra', 'venda', 'ajuste', 'devolucao')),
  note text not null default '',
  user_id uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.stock_movements (variant_id, created_at desc);

create or replace function public.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.product_variants set stock_on_hand = stock_on_hand + new.delta where id = new.variant_id;
  return new;
end;
$$;
create trigger stock_movements_apply after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.stock_movements enable row level security;

-- Público: só produtos publicados e variantes ativas
create policy "público lê produtos publicados" on public.products for select to anon using (status = 'publicado');
create policy "público lê variantes ativas" on public.product_variants for select to anon
  using (active and exists (select 1 from public.products p where p.id = product_id and p.status = 'publicado'));
create policy "público lê fotos e vídeos visíveis de produtos publicados" on public.product_media for select to anon
  using (visible and exists (select 1 from public.products p where p.id = product_id and p.status = 'publicado'));

-- O público não vê o saldo exato nem os nomes da planilha antiga: só se há pronta entrega
revoke select on public.products from anon;
grant select (id, slug, title, category, status, description, specs, options, position, updated_at) on public.products to anon;
revoke select on public.product_variants from anon;
grant select (id, product_id, sku, options, price_cents, compare_at_cents, stock_policy, lead_time_days, in_stock, active, position) on public.product_variants to anon;

-- Equipe do painel: tudo
create policy "equipe gerencia produtos" on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia variantes" on public.product_variants for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe gerencia fotos de produtos" on public.product_media for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipe lê estoque" on public.stock_movements for select to authenticated using (public.is_staff());
create policy "equipe movimenta estoque" on public.stock_movements for insert to authenticated with check (public.is_staff());
