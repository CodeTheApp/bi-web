-- Brasília Iluminação — loja, fase 2: clientes, favoritos e pedidos
-- Clientes entram por código no e-mail ou Google (Supabase Auth). Equipe do painel = quem tem linha em profiles;
-- cliente tem linha em customers e nunca vira equipe por entrar na loja.

create table public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text not null default '',
  cpf text not null default '',
  provider text not null default 'email' check (provider in ('email', 'google')),
  created_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  recipient text not null,
  cep text not null,
  street text not null,
  number text not null,
  complement text not null default '',
  district text not null,
  city text not null,
  uf text not null check (char_length(uf) = 2),
  created_at timestamptz not null default now()
);
create index on public.customer_addresses (customer_id, created_at desc);

create table public.favorites (
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

-- Pedido guarda uma cópia dos itens, do frete e do pagamento como eram na hora da compra.
create sequence public.order_number_seq start 1001;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number int not null unique default nextval('public.order_number_seq'),
  customer_id uuid references public.customers (id) on delete set null,
  email text not null,
  name text not null,
  phone text not null default '',
  items jsonb not null,
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  shipping jsonb not null default '{}'::jsonb,
  payment jsonb,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'em_separacao', 'enviado', 'entregue', 'cancelado')),
  tracking text not null default '',
  notes text not null default '',
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (customer_id, created_at desc);
create index on public.orders (status, created_at desc);
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.orders enable row level security;

-- Cliente: só os próprios dados
create policy "cliente lê o próprio cadastro" on public.customers for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "cliente cria o próprio cadastro" on public.customers for insert to authenticated with check (id = auth.uid());
create policy "cliente edita o próprio cadastro" on public.customers for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "cliente gerencia os próprios endereços" on public.customer_addresses for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "equipe lê endereços" on public.customer_addresses for select to authenticated using (public.is_staff());

create policy "cliente gerencia os próprios favoritos" on public.favorites for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Pedidos são criados e atualizados pelo servidor (chave de serviço), que calcula preço, frete e total:
-- o cliente só lê os seus; a equipe lê e acompanha todos.
create policy "cliente lê os próprios pedidos" on public.orders for select to authenticated using (customer_id = auth.uid());
create policy "equipe lê pedidos" on public.orders for select to authenticated using (public.is_staff());
create policy "equipe atualiza pedidos" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
