# Commerce examples

The demonstration repositories select independent `examples` and `empty` workspaces through `server/demo-workspace.ts`. “Sem exemplos” starts without fixtures and can subsequently hold records created during testing. Switching modes preserves both workspaces.

On its first load, the examples workspace clones the existing local catalog and shop state, then adds 24 clearly identified demo products, 48 historical orders, 16 fictitious customers and six example coupons. Prices, variants, category coverage, order statuses, Pix/card/manual payments, discounts, refunds and shipping totals populate the existing administration and reports. Orders span the preceding 67 days, with additional density in the most recent weeks. Each order's customer, variant IDs, coupon snapshot, payment and audit dates remain consistent.

Fixture IDs use a reserved UUID namespace. Product names, customer names, coupon codes, order notes and stock-history descriptions identify the examples. Fictional customer addresses use `.example` email domains. Products without actual photos use the existing `ProductArt` illustration.

Existing records, prices, stock balances and local files are preserved. All subsequent workspace writes use `demo-workspace-shop-{mode}.json` or `demo-workspace-catalog-{mode}.json`; original `demo-loja.json`, `demo-catalogo-estado.json` and `catalogo.json` remain source backups. Deferred writes capture the selected object and mode before awaiting other work.

The fixture-version marker makes seeding idempotent. Reloading or revisiting a workspace does not recreate deleted examples or overwrite edited rows. Initial stock belongs only to newly created fictional variants; additional historical movement groups net zero for every referenced variant. Example order payments and cancellations are identified by both their reserved ID and server-generated checkout marker, and skip real stock changes only in a demo repository. Genuine orders continue through the regular stock flow.

Repository selection and fixture initialization are guarded by the existing demo environment policy. Supabase repositories never seed examples. No external database, real payment, email or original local data file is modified by fixture generation.
