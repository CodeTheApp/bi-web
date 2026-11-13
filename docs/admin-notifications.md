# Administrative notifications

`features/admin-notifications` exposes `AdminNotifications({ userId, demo, realtime? })`. The shell renders the native Radix popover. Lucide Animated supplies its icons, TanStack Query fetches/refreshes the feed, and a Zustand observer partitions seen IDs by authenticated staff member and demo workspace.

The server derives stable notifications from existing customer registrations, orders, and inbound messages. Outbound replies are excluded. It returns the most recent 200 records within 120 days with a title, concise description, internal destination and read status. Customer actions open the customer list filtered by the existing `q` URL state; order and message actions open the specific record. Raw checkout data, CPF, message bodies and payment details are not part of the feed DTO.

The initial successful snapshot establishes a silent baseline. Later unseen, unread records created after that baseline show Sileo notices with “Ver cliente”, “Ver pedido” or “Ler mensagem”. A burst displays up to five individual notices and a link to the remaining feed. Merely opening the popover does not acknowledge notifications; opening a record or choosing “Marcar todas como lidas” does.

Supabase uses INSERT subscriptions on `customers`, `orders`, and inbound `messages`, plus read-marker changes for the current staff member. A 20-second poll remains available if Realtime cannot connect. Demonstration repositories poll every five seconds. The server authenticates every read/write and rejects a demo response if the selected workspace changes while source reads are in flight.

Migration `20261112000800_admin_notification_reads.sql` adds only per-user acknowledgements; business flows do not create duplicate notification records. RLS restricts SELECT/INSERT/UPDATE to the authenticated staff member's own rows. It conditionally adds the source tables and acknowledgements to `supabase_realtime`, preserving existing publication membership. Apply this migration to an actual Supabase project before using the production feed; it has not been applied remotely by this change.

Demo read acknowledgements use separate `demo-workspace-notifications-{examples|empty}-reads.json` files. They never alter source records, thread read status, or the other workspace. Production uses the database table; no browser notification content is persisted.
