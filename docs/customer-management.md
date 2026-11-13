# Customer management

The client list opens a native Radix dialog positioned as a drawer. Selection uses the `cliente` nuqs parameter; search, sorting and pagination stay in the URL. The name cell exposes a keyboard-accessible button. Closing restores focus to that button, or to search if the row is no longer present. Escape, backdrop and close-button dismissal ask whether to discard unsaved edits; closing is blocked during a save.

Profile and order history load through independent staff-authenticated Server Actions, so editing does not wait for the purchase history. The drawer uses `AdminBlockLoading`, Kokonut SaveStatus, and ReUI sorting/pagination for order links. Financial metrics count all orders but sum only paid, non-cancelled order totals; those totals already include shipping and coupon discounts. Historical order snapshots remain unchanged when a customer is edited.

The editable CRM fields are name, telephone and **contact email**. The email used to sign in remains read-only and visibly protected. A blank contact email falls back to the login email for the mailto link. WhatsApp links normalize national Brazilian numbers while preserving an explicit international prefix. Contact controls are links only; saving never sends email or messages.

Migration `20261112000900_customer_contacts.sql` adds `customers.contact_email` and `update_customer_contact`. The RPC checks staff membership and updates only the three allowed columns. It does not write to Supabase Auth, change login email/provider, rewrite orders, or grant staff a broader direct UPDATE policy. The published server schema rejects additional Auth/private fields. The customer detail DTO excludes CPF and addresses.

The demonstration implementation updates only its captured examples/empty workspace and writes to that workspace's separate file. Existing source files and fixtures are not rewritten by initialization. The migration is included in the repository and has not been applied to a remote Supabase project.
