-- Feed entries are derived from existing records; only each staff member's read
-- acknowledgements are stored. No duplicate notification writes in business flows.
create table public.admin_notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null check (length(notification_key) <= 120 and notification_key ~ '^(customer|order|message):[A-Za-z0-9_-]+$'),
  read_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);
create index admin_notification_reads_recent on public.admin_notification_reads(user_id, read_at desc);
alter table public.admin_notification_reads enable row level security;
revoke all on public.admin_notification_reads from anon;
grant select, insert, update on public.admin_notification_reads to authenticated;
create policy "staff reads own notification acknowledgements" on public.admin_notification_reads for select to authenticated using (user_id = auth.uid() and public.is_staff());
create policy "staff acknowledges own notifications" on public.admin_notification_reads for insert to authenticated with check (user_id = auth.uid() and public.is_staff());
create policy "staff updates own notification acknowledgements" on public.admin_notification_reads for update to authenticated using (user_id = auth.uid() and public.is_staff()) with check (user_id = auth.uid() and public.is_staff());

-- Realtime delivers inserts under the source tables' existing staff RLS. The
-- publication can already contain messages from earlier migrations.
do $$
declare source_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach source_table in array array['customers','orders','messages','admin_notification_reads'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = source_table) then
        execute format('alter publication supabase_realtime add table public.%I', source_table);
      end if;
    end loop;
  end if;
end $$;
