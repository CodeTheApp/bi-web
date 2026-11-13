# Storefront state public APIs

- `@/entities/cart`: persisted cart store, its factory and cart actions.
- `@/entities/favorite`: persisted favorite store, its factory and account synchronization coordinator.
- `@/entities/shipping`: persisted postal-code store and its factory.
- `@/features/product-selection`: server-safe product query parsers.
- `@/features/catalog-filter`: server-safe catalogue query parsers, loader and serializer.
- `@/features/catalog-filter/client`: interactive toolbar and query-aware link component.
- `@/features/catalog-filter/server`: server-rendered filter panel, active chips and pagination.
- `@/features/shopping`: public storefront provider, hook and UI components.

Catalogue parsers use `nuqs/server`. Their entry point deliberately does not re-export interactive UI, so a server consumer can import a parser without importing a client hook. The separate `client.ts` and `server.ts` entries make UI boundaries explicit.

The shopping entry point re-exports both server-renderable product cards/helpers and client component boundaries. It has no `use client` directive: the original leaf modules retain their boundaries. Only client components may call `useShop`; server modules may render exported client components or call the product-card helpers.

Code outside a slice imports these entry points. Code inside a slice can import its own segments directly. Tests may import a model directly when testing that model in isolation.
