import { afterEach, describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ enabled: true, supabase: false, catalog: vi.fn(), shop: vi.fn(), rpc: vi.fn().mockResolvedValue({ error: null }), range: vi.fn().mockResolvedValue({ data: [], error: null }) }));
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/env", () => ({ get hasSupabase() { return deps.supabase; } }));
vi.mock("@/shared/api/supabase/server", () => ({ createSupabasePublic: () => ({ rpc: deps.rpc }), createSupabaseServer: async () => { const query = { select: () => query, gte: () => query, order: () => query, range: deps.range }; return { from: () => query }; } }));
vi.mock("@/server/admin/repo", () => ({ demoAllowed: () => deps.enabled }));
vi.mock("@/server/admin/repo-demo", () => ({ getDemoAdminStore: () => ({ projects: [{ slug: "projeto-exemplo", status: "publicado" }] }) }));
vi.mock("@/server/catalog/public", () => ({ getCatalog: deps.catalog }));
vi.mock("@/server/shop/repo", () => ({ getShopRepo: deps.shop }));
import { createDemoAnalyticsEvents } from "@/server/analytics/demo-fixtures";
import { readEvents, recordEvent } from "@/server/analytics/repo";
import { setDemoDataMode } from "@/server/demo-workspace";
import { siteEventSchema, trafficSummary } from "@/entities/site-analytics";
import type { Order } from "@/entities/order";

const product = { id: "81000000-0000-4000-8000-000000000001", slug: "pendente-exemplo" };
const input = { id: "82000000-0000-4000-8000-000000000001", session: "83000000-0000-4000-8000-000000000001", event: "page_view" as const, path: "/" };
afterEach(() => {
  const memory = globalThis as Record<string, unknown>;
  for (const key of ["__biAnalytics", "__biAnalyticsEmpty", "__biAnalyticsSeedLoads", "__biDemoWorkspace"]) delete memory[key];
  deps.enabled = true; deps.supabase = false; vi.clearAllMocks();
});

describe("synthetic demo analytics", () => {
  it("creates stable anonymous events across 90 days using actual route/product references and approval dates", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    const paid = { id: "order-private-id", name: "Private Customer", email: "private@example.test", payment: { paidAt: "2026-11-10T12:00:00Z" }, timeline: [], items: [{ productId: product.id }] } as unknown as Order;
    const events = createDemoAnalyticsEvents([product], [{ slug: "projeto-exemplo" }], [paid], now);
    expect(events).toEqual(createDemoAnalyticsEvents([product], [{ slug: "projeto-exemplo" }], [paid], now));
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(trafficSummary(events, { from: null, to: null }).days).toHaveLength(90);
    expect(events.every((event) => Date.parse(event.at) <= now.getTime())).toBe(true);
    for (const { at, ...event } of events) { expect(siteEventSchema.safeParse(event).success).toBe(true); expect(at).toBeTruthy(); }
    expect(events.filter((event) => event.event === "purchase")).toMatchObject([{ at: new Date(paid.payment!.paidAt!).toISOString() }]);
    expect(events.some((event) => event.path === `/loja/${product.slug}`)).toBe(true);
    expect(events.some((event) => event.path === "/projetos/projeto-exemplo")).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/Private Customer|private@example.test|order-private-id/);
  });

  it("seeds once, preserves observed events, and isolates the empty workspace on round trips", async () => {
    deps.catalog.mockResolvedValue([product]); deps.shop.mockResolvedValue({ analyticsOrders: async () => [] });
    const first = await readEvents();
    expect(first.events.length).toBeGreaterThan(1000);
    expect(first.syntheticEvents).toBe(first.events.length);
    await recordEvent(input);
    expect((await readEvents()).events).toHaveLength(first.events.length + 1);
    expect(deps.catalog).toHaveBeenCalledOnce();
    setDemoDataMode("empty");
    expect(await readEvents()).toMatchObject({ events: [], dataMode: "empty", syntheticEvents: 0 });
    await recordEvent({ ...input, id: "82000000-0000-4000-8000-000000000002" });
    expect((await readEvents()).events).toHaveLength(1);
    setDemoDataMode("examples");
    expect((await readEvents()).events).toHaveLength(first.events.length + 1);
    expect(deps.catalog).toHaveBeenCalledOnce();
  });

  it("does not seed or collect into demo memory in Supabase or disabled demo environments", async () => {
    deps.enabled = false;
    expect((await readEvents()).events).toEqual([]);
    await recordEvent(input);
    expect(deps.catalog).not.toHaveBeenCalled();
    deps.supabase = true;
    expect(await readEvents()).toMatchObject({ events: [], dataMode: "live", syntheticEvents: 0 });
    await recordEvent(input);
    expect(deps.rpc).toHaveBeenCalledOnce();
    expect(deps.catalog).not.toHaveBeenCalled();
    expect((globalThis as { __biAnalytics?: unknown }).__biAnalytics).toBeUndefined();
  });
});
