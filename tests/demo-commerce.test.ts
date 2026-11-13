import { beforeEach, describe, expect, it, vi } from "vitest";
import { couponDraftSchema } from "@/entities/coupon";
import { productSchema, type Product } from "@/entities/product";
import { cartSubtotal } from "@/entities/order";
import {
  analyticsOrder,
  dateRange,
  financialSummary,
  salesSummary,
} from "@/entities/shop-analytics/model";

const files = vi.hoisted(() => ({
  allowed: true,
  saved: new Map<string, unknown>(),
  writes: [] as Array<{ file: string; value: () => unknown }>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/admin/repo", () => ({ demoAllowed: () => files.allowed }));
vi.mock("@/server/demo-file", () => ({
  readDemo: (file: string) => structuredClone(files.saved.get(file) ?? null),
  writeDemoSoon: (file: string, value: () => unknown) =>
    files.writes.push({ file, value }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));
import {
  buildDemoCommerceFixtures,
  isDemoOrderFixture,
  seedDemoCommerce,
  type CommerceFixtureState,
} from "@/server/shop/demo-fixtures";
import {
  buildDemoCatalogFixtures,
  buildDemoInventoryFixtures,
  seedDemoCatalog,
} from "@/server/catalog/demo-fixtures";
import { catalogStore, type CatalogStore } from "@/server/catalog/store";
import { demoShop } from "@/server/shop/repo-demo";
import { demoCatalog } from "@/server/catalog/repo-demo";
import { setDemoDataMode } from "@/server/demo-workspace";

const memory = globalThis as typeof globalThis & {
  __biCatalog?: CatalogStore;
  __biCatalogWorkspaces?: unknown;
  __biShop?: unknown;
  __biShopWorkspaces?: unknown;
  __biDemoWorkspace?: unknown;
  __biWorkspaceCodes?: unknown;
};
const now = new Date("2026-11-12T19:00:00Z");
const genuine: Product = productSchema.parse({
  id: "real-product",
  slug: "real-product",
  title: "Produto existente",
  category: "pendentes",
  status: "publicado",
  media: [],
  variants: [
    {
      id: "real-variant",
      sku: "REAL-1",
      options: {},
      priceCents: 95000,
      stockPolicy: "estoque",
      stock: 7,
      active: true,
    },
  ],
});

beforeEach(() => {
  files.allowed = true;
  files.saved.clear();
  files.writes.length = 0;
  delete memory.__biCatalogWorkspaces;
  delete memory.__biShopWorkspaces;
  delete memory.__biShop;
  delete memory.__biDemoWorkspace;
  delete memory.__biWorkspaceCodes;
  memory.__biCatalog = { products: [structuredClone(genuine)], moves: [] };
});

describe("coherent demonstration fixtures", () => {
  it("creates valid catalog rows spanning categories, statuses, choices and pricing states", () => {
    const fixtures = buildDemoCatalogFixtures(now);
    expect(fixtures.products).toHaveLength(24);
    expect(
      fixtures.products.every(
        (product) => productSchema.safeParse(product).success,
      ),
    ).toBe(true);
    expect(
      new Set(fixtures.products.map((product) => product.category)).size,
    ).toBe(10);
    expect(
      new Set(fixtures.products.map((product) => product.status)).size,
    ).toBe(3);
    expect(
      fixtures.products.some((product) =>
        product.variants.some((variant) => variant.priceCents === null),
      ),
    ).toBe(true);
  });
  it("keeps order relationships, net totals, coupons and timeline dates consistent", () => {
    const catalog = [genuine, ...buildDemoCatalogFixtures(now).products];
    const fixtures = buildDemoCommerceFixtures(catalog, now, 2001);
    expect(fixtures.orders).toHaveLength(48);
    expect(fixtures.customers).toHaveLength(16);
    expect(fixtures.coupons).toHaveLength(6);
    const customerIds = new Set(
      fixtures.customers.map((customer) => customer.id),
    );
    const variantIds = new Set(
      catalog.flatMap((product) =>
        product.variants.map((variant) => variant.id),
      ),
    );
    const couponIds = new Set(fixtures.coupons.map((coupon) => coupon.id));
    for (const order of fixtures.orders) {
      expect(isDemoOrderFixture(order)).toBe(true);
      expect(customerIds.has(order.customerId)).toBe(true);
      expect(order.items.every((item) => variantIds.has(item.variantId))).toBe(
        true,
      );
      expect(order.subtotalCents).toBe(cartSubtotal(order.items));
      expect(order.totalCents).toBe(
        order.subtotalCents - (order.discountCents ?? 0) + order.shippingCents,
      );
      expect(order.discountCents).toBe(order.coupon?.discountCents ?? 0);
      if (order.coupon) expect(couponIds.has(order.coupon.id)).toBe(true);
      expect(
        order.timeline.every(
          (event) =>
            Date.parse(event.at) >= Date.parse(order.createdAt) &&
            Date.parse(event.at) <= now.getTime(),
        ),
      ).toBe(true);
    }
    expect(
      fixtures.coupons.every(
        (coupon) => couponDraftSchema.safeParse(coupon).success,
      ),
    ).toBe(true);
    expect(new Set(fixtures.orders.map((order) => order.status)).size).toBe(6);
    expect(
      new Set(fixtures.orders.map((order) => order.payment?.method)).size,
    ).toBe(3);
    const analytics = fixtures.orders.map(analyticsOrder);
    for (const range of [
      dateRange("7d", "", "", now),
      dateRange("30d", "", "", now),
      { from: "2026-10-01", to: "2026-10-31" },
    ]) {
      const financial = financialSummary(analytics, range);
      expect(financial.receivedCents).toBeGreaterThan(0);
      expect(financial.refundedCents).toBeGreaterThan(0);
      expect(salesSummary(analytics, range).totalCents).toBeGreaterThan(0);
    }
  });
  it("uses balanced inventory history and preserves genuine product/stock data", () => {
    const state: CatalogStore = {
      products: [structuredClone(genuine)],
      moves: [],
    };
    seedDemoCatalog(state, now);
    expect(state.products.find((product) => product.id === genuine.id)).toEqual(
      genuine,
    );
    const historical = buildDemoInventoryFixtures(state.products, now);
    const deltas = new Map<string, number>();
    for (const move of historical)
      deltas.set(
        move.variantId,
        (deltas.get(move.variantId) ?? 0) + move.delta,
      );
    expect([...deltas.values()].every((delta) => delta === 0)).toBe(true);
    const before = structuredClone(state);
    expect(seedDemoCatalog(state, new Date(now.getTime() + 86400000))).toBe(
      false,
    );
    expect(state).toEqual(before);
  });
  it("never overwrites existing commerce rows or regenerates examples after edits", () => {
    const state: CommerceFixtureState = {
      seq: 1900,
      customers: [],
      orders: [],
      coupons: [],
    };
    const catalog = [genuine];
    expect(seedDemoCommerce(state, catalog, now)).toBe(true);
    state.orders[0].notes = "Minha edição";
    state.coupons.pop();
    const snapshot = structuredClone(state);
    expect(
      seedDemoCommerce(state, catalog, new Date(now.getTime() + 86400000)),
    ).toBe(false);
    expect(state).toEqual(snapshot);
    expect(state.seq).toBe(1948);
  });
});

describe("isolated demo commerce workspaces", () => {
  it("switches datasets without changing originals and keeps in-flight writes in their captured workspace", async () => {
    const original = structuredClone(memory.__biCatalog);
    const examples = demoShop();
    const exampleCatalog = demoCatalog();
    expect(await examples.allOrders()).toHaveLength(48);
    expect(await exampleCatalog.list()).toHaveLength(25);
    setDemoDataMode("empty");
    const empty = demoShop();
    expect(await empty.allOrders()).toEqual([]);
    expect(await empty.customers()).toEqual([]);
    expect(await empty.coupons()).toEqual([]);
    expect(catalogStore().products).toEqual([]);
    const newProduct = await exampleCatalog.create();
    expect(await exampleCatalog.get(newProduct)).not.toBeNull();
    expect(await demoCatalog().get(newProduct)).toBeNull();
    await examples.saveCoupon(null, {
      code: "MYTEST",
      kind: "fixo",
      value: 100,
      minimumCents: 0,
      active: false,
      startsAt: null,
      expiresAt: null,
      maxUses: null,
    });
    expect(await empty.couponByCode("MYTEST")).toBeNull();
    expect(memory.__biCatalog).toEqual(original);
    expect(
      files.writes.every((write) =>
        /^demo-workspace-(shop|catalog)-(examples|empty)\.json$/.test(
          write.file,
        ),
      ),
    ).toBe(true);
    expect(
      files.writes
        .findLast(
          (write) => write.file === "demo-workspace-shop-examples.json",
        )!
        .value(),
    ).toEqual(
      expect.objectContaining({
        coupons: expect.arrayContaining([
          expect.objectContaining({ code: "MYTEST" }),
        ]),
      }),
    );
    setDemoDataMode("examples");
    expect((await demoShop().allOrders()).length).toBe(48);
    expect(await demoShop().couponByCode("MYTEST")).not.toBeNull();
  });
  it("loads a saved workspace before the legacy originals", async () => {
    const savedCatalog: CatalogStore = {
      products: [],
      moves: [],
      demoFixtures: { version: 1, createdAt: now.toISOString() },
    };
    files.saved.set("demo-workspace-catalog-examples.json", savedCatalog);
    expect(catalogStore().products).toEqual([]);
    expect(memory.__biCatalog!.products).toEqual([genuine]);
    files.saved.set("demo-workspace-shop-examples.json", {
      secret: "secret",
      seq: 1450,
      customers: [],
      favorites: {},
      orders: [],
      coupons: [],
      demoFixtures: { version: 1, createdAt: now.toISOString() },
    });
    expect(await demoShop().allOrders()).toEqual([]);
    expect(await demoShop().coupons()).toEqual([]);
  });
  it("does not activate demo repositories when the production guard rejects them", () => {
    files.allowed = false;
    expect(() => demoShop()).toThrow("indisponível");
    expect(() => demoCatalog()).toThrow("indisponível");
    expect(catalogStore().products).toEqual([genuine]);
    expect(files.writes).toHaveLength(0);
  });
});
