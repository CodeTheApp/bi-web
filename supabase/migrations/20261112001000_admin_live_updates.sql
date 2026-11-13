-- Publish existing tables only. Their current RLS policies continue to govern
-- which rows staff can receive; this migration grants no additional access.
do $$
declare source_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach source_table in array array[
      'threads','messages','admin_notification_reads','sections','testimonials','faqs',
      'projects','project_images','media','media_categories','settings','profiles',
      'products','product_variants','product_media','stock_movements','orders',
      'customers','customer_addresses','coupons','coupon_redemptions','site_events','audit_log'
    ] loop
      if to_regclass(format('public.%I', source_table)) is not null
        and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = source_table) then
        execute format('alter publication supabase_realtime add table public.%I', source_table);
      end if;
    end loop;
  end if;
end $$;
