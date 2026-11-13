# Private administrative reads

Browser queries use the named functions from `shared/api/admin-reads.ts`. Their argument and `Result` payload types come from the original Server Actions through the type-only `server/admin/read-contract.ts`. Mutations remain Server Actions. The shim has no runtime dependency on server modules.

Each read is an independent credentialed GET to `/api/admin/read/{resource}?args={JSON tuple}` with `cache: "no-store"`. This avoids the browser's serialized Server Action POST queue when independent blocks load together. Existing `unwrap(...)` calls and TanStack Query result types remain compatible. An optional final `{ signal }` forwards query cancellation to fetch; for optional filters, use `getStockMoves(undefined, { signal })`.

The gateway authenticates staff before looking up resources or returning validation errors. A closed whitelist and Zod tuple schemas allow only known readers and their valid arguments. Unknown methods, mutations, invalid list kinds, excess arguments and malformed/oversized query payloads cannot dispatch. Responses preserve the existing `Result` envelope and use `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`, and `nosniff`. Original readers continue to enforce their existing authorization and output rules.

`getThread` is intentionally pure in the GET gateway. Opening an unread conversation is acknowledged separately through the guarded, idempotent `markThreadRead` Server Action. The legacy `getThread` action remains compatible for older server callers.

Tests cover private headers, authentication, strict dispatch, malformed requests, read-only thread fetching, preserved errors, simultaneous reads, optional arguments and fetch cancellation. No remote schema or data changes are involved.
