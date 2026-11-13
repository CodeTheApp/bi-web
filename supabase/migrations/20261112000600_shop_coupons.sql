-- Coupons are validated and redeemed by the trusted checkout, never by the browser.
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  kind text not null check (kind in ('percentual', 'fixo')),
  value int not null check (value > 0 and (kind <> 'percentual' or value <= 100)),
  minimum_cents int not null default 0 check (minimum_cents >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default false,
  max_uses int check (max_uses > 0),
  created_at timestamptz not null default now(),
  check (starts_at is null or expires_at is null or expires_at > starts_at)
);
alter table public.coupons enable row level security;
create policy "equipe gerencia cupons" on public.coupons for all to authenticated using (public.is_staff()) with check (public.is_staff());

alter table public.orders add column discount_cents int not null default 0 check (discount_cents >= 0 and discount_cents <= subtotal_cents);
alter table public.orders add column coupon jsonb;
alter table public.orders add column checkout_key uuid;
create unique index orders_checkout_key on public.orders (customer_id, checkout_key) where checkout_key is not null;

create table public.coupon_redemptions (
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id uuid primary key references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.coupon_redemptions enable row level security;
create policy "equipe lê uso dos cupons" on public.coupon_redemptions for select to authenticated using (public.is_staff());

create function public.shop_coupon_usage() returns table(coupon_id uuid, used bigint)
language sql security definer set search_path=public as $$
  select r.coupon_id, count(*) from public.coupon_redemptions r join public.orders o on o.id=r.order_id
  where o.status <> 'cancelado' group by r.coupon_id;
$$;
revoke all on function public.shop_coupon_usage() from public, anon, authenticated;
grant execute on function public.shop_coupon_usage() to service_role;

-- Service-role only. The caller has already authenticated the customer and priced
-- every line from the catalogue; this transaction validates coupon dates/limits
-- again under its row lock, creates its reservation and the order together.
create function public.create_shop_checkout(p_order jsonb, p_key uuid, p_code text default '') returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  o public.orders;
  c public.coupons;
  customer uuid := (p_order->>'customer_id')::uuid;
  subtotal int := (p_order->>'subtotal_cents')::int;
  shipping int := (p_order->>'shipping_cents')::int;
  discount int := 0;
  usage bigint;
  snapshot jsonb := null;
begin
  if customer is null or p_key is null or subtotal < 0 or shipping < 0 then raise exception 'Pedido inválido.'; end if;
  -- Two taps with the same checkout key never create or charge a second order.
  perform pg_advisory_xact_lock(hashtextextended(customer::text || p_key::text, 0));
  select * into o from public.orders where customer_id=customer and checkout_key=p_key;
  if found then return jsonb_build_object('order',to_jsonb(o),'created',false); end if;

  if coalesce(p_code,'') <> '' then
    select * into c from public.coupons where code=upper(trim(p_code)) for update;
    if not found then raise exception 'Cupom não encontrado.'; end if;
    if not c.active then raise exception 'Este cupom está desativado.'; end if;
    if c.starts_at is not null and c.starts_at > now() then raise exception 'Este cupom ainda não começou.'; end if;
    if c.expires_at is not null and c.expires_at <= now() then raise exception 'Este cupom expirou.'; end if;
    if subtotal < c.minimum_cents then raise exception 'O pedido não atingiu o valor mínimo do cupom.'; end if;
    select count(*) into usage from public.coupon_redemptions r join public.orders ord on ord.id=r.order_id where r.coupon_id=c.id and ord.status <> 'cancelado';
    if c.max_uses is not null and usage >= c.max_uses then raise exception 'Este cupom atingiu o limite de usos.'; end if;
    discount := least(subtotal,case when c.kind='percentual' then floor(subtotal::numeric*c.value/100)::int else c.value end);
    if discount=0 then raise exception 'Adicione produtos para usar o cupom.'; end if;
    snapshot := jsonb_build_object('id',c.id,'code',c.code,'kind',c.kind,'value',c.value,'discountCents',discount);
    -- A quote racing an administrative coupon edit must be confirmed again.
    if discount <> coalesce((p_order->>'discount_cents')::int,0) then raise exception 'O cupom mudou. Confira o total e confirme novamente.'; end if;
  end if;
  insert into public.orders(customer_id,email,name,phone,items,subtotal_cents,shipping_cents,total_cents,discount_cents,coupon,checkout_key,shipping,payment,status,tracking,notes,timeline)
  values(customer,p_order->>'email',p_order->>'name',coalesce(p_order->>'phone',''),p_order->'items',subtotal,shipping,subtotal-discount+shipping,discount,snapshot,p_key,p_order->'shipping',null,'aguardando_pagamento','',coalesce(p_order->>'notes',''),coalesce(p_order->'timeline','[]'::jsonb)) returning * into o;
  if c.id is not null then insert into public.coupon_redemptions(coupon_id,order_id) values(c.id,o.id); end if;
  return jsonb_build_object('order',to_jsonb(o),'created',true);
end;
$$;
revoke all on function public.create_shop_checkout(jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.create_shop_checkout(jsonb,uuid,text) to service_role;
