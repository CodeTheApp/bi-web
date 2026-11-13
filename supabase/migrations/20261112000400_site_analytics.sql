-- Anonymous, first-party observations. No IP, user agent, query string or customer identifier.
create table public.site_events (
  id uuid primary key,
  session_id uuid not null,
  event_name text not null check (event_name in ('page_view','product_view','add_to_cart','favorite','checkout_started','purchase')),
  page_path text not null check (length(page_path) between 1 and 300 and page_path like '/%' and page_path !~ '[?#[:space:]]'),
  product_ref uuid,
  created_at timestamptz not null default now()
);
create index site_events_date on public.site_events (created_at desc, id);
create index site_events_session_date on public.site_events (session_id, created_at desc);
alter table public.site_events enable row level security;
revoke all on public.site_events from anon;
grant select on public.site_events to authenticated;
create policy "staff reads anonymous analytics" on public.site_events for select to authenticated using (public.is_staff());

create or replace function public.record_site_event(event_id uuid, session_id uuid, event_name text, page_path text, product_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  safe_path text;
begin
  if event_name not in ('page_view','product_view','add_to_cart','favorite','checkout_started','purchase')
    or page_path !~ '^/' or page_path ~ '[?#[:space:]]' or page_path ~ '^/(admin|api|preview)(/|$)'
    or length(page_path) > 300 or (product_ref is not null and product_ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
    raise exception 'Invalid analytics event';
  end if;
  -- The RPC is also public through PostgREST, so it enforces the same
  -- normalization as the HTTP collector even when that collector is bypassed.
  safe_path := regexp_replace(page_path, '/+$', '');
  if safe_path = '' then safe_path := '/'; end if;
  if safe_path ~ '^/loja/pedido(/.*)?$' then safe_path := '/loja/pedido';
  elsif safe_path ~ '^/conta(/.*)?$' then safe_path := '/conta';
  elsif safe_path not in ('/','/loja','/loja/checkout','/loja/favoritos') and safe_path !~* '^/(loja|projetos)/[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid analytics path';
  end if;
  -- Serialize events for this anonymous session to keep the limit effective concurrently.
  perform pg_advisory_xact_lock(hashtextextended(session_id::text,0));
  if (select count(*) from public.site_events e where e.session_id=record_site_event.session_id and e.created_at > now()-interval '1 minute') >= 90 then return; end if;
  insert into public.site_events (id,session_id,event_name,page_path,product_ref)
  values (event_id,session_id,event_name,safe_path,product_ref::uuid) on conflict(id) do nothing;
end;
$$;
revoke all on function public.record_site_event(uuid,uuid,text,text,text) from public;
grant execute on function public.record_site_event(uuid,uuid,text,text,text) to anon, authenticated;
