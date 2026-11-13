import "server-only";
import type { SiteEvent, SiteEventInput } from "@/entities/site-analytics";
import { hasSupabase } from "@/shared/api/supabase/env";
import { createSupabasePublic, createSupabaseServer } from "@/shared/api/supabase/server";
import { demoAllowed } from "@/server/admin/repo";
import { getDemoAdminStore } from "@/server/admin/repo-demo";
import { getDemoDataMode, type DemoDataMode } from "@/server/demo-workspace";
import { getCatalog } from "@/server/catalog/public";
import { getShopRepo } from "@/server/shop/repo";
import { ANALYTICS_FIXTURE_VERSION, createDemoAnalyticsEvents } from "./demo-fixtures";
import { publishAdminEvent } from "@/server/admin-events/event-bus";

export type AnalyticsMemory = { events: SiteEvent[]; startedAt: string; exampleSeedVersion?: number; exampleEventIds?: string[] };
const globals = globalThis as typeof globalThis & { __biAnalytics?: AnalyticsMemory; __biAnalyticsEmpty?: AnalyticsMemory; __biAnalyticsSeedLoads?: Map<DemoDataMode, Promise<void>> };
async function memory() {
  const mode = getDemoDataMode();
  const store = mode === "examples" ? globals.__biAnalytics ??= { events: [], startedAt: new Date().toISOString() } : globals.__biAnalyticsEmpty ??= { events: [], startedAt: new Date().toISOString() };
  if (mode === "examples" && demoAllowed() && store.exampleSeedVersion !== ANALYTICS_FIXTURE_VERSION) {
    const loads = globals.__biAnalyticsSeedLoads ??= new Map();
    if (!loads.has(mode)) {
      const pending = (async () => {
        const [products, shop] = await Promise.all([getCatalog(), getShopRepo()]);
        const orders = await shop.analyticsOrders();
        // Dynamic repo imports can yield. A switch while loading must not seed another workspace's data.
        if (getDemoDataMode() !== mode) return;
        const projects = getDemoAdminStore(mode).projects.filter((project) => project.status === "publicado");
        const fixtures = createDemoAnalyticsEvents(products, projects, orders);
        const existing = new Set(store.events.map((event) => event.id));
        store.events.push(...fixtures.filter((event) => !existing.has(event.id)));
        store.events.sort((a, b) => a.at.localeCompare(b.at));
        store.exampleEventIds = fixtures.map((event) => event.id);
        store.exampleSeedVersion = ANALYTICS_FIXTURE_VERSION;
        store.startedAt = store.events[0]?.at ?? store.startedAt;
      })();
      loads.set(mode, pending);
      pending.finally(() => { if (loads.get(mode) === pending) loads.delete(mode); }).catch(() => {});
    }
    await loads.get(mode);
  }
  return { store, mode };
}
const MAX_EVENTS = 100000;

export async function recordEvent(input: SiteEventInput) {
  if (hasSupabase) {
    const result = await createSupabasePublic().rpc("record_site_event", { event_id: input.id, session_id: input.session, event_name: input.event, page_path: input.path, product_ref: input.productId ?? null });
    if (result.error) throw result.error;
    return;
  }
  if (!demoAllowed()) return;
  const { store, mode } = await memory();
  const now = Date.now();
  store.events = store.events.filter((event) => Date.parse(event.at) > now - 180 * 86400e3).slice(-MAX_EVENTS);
  if (store.events.some((event) => event.id === input.id)) return;
  if (store.events.filter((event) => event.session === input.session && Date.parse(event.at) > now - 60000).length >= 90) return;
  store.events.push({ ...input, at: new Date(now).toISOString() });
  publishAdminEvent(["site-analytics"], mode);
}

export async function readEvents() {
  if (!hasSupabase) {
    if (!demoAllowed()) return { events: [], startedAt: null, truncated: false, dataMode: "live" as const, syntheticEvents: 0 };
    const { store, mode } = await memory();
    const exampleIds = new Set(store.exampleEventIds ?? []);
    return { events: [...store.events], startedAt: store.startedAt, truncated: false, dataMode: mode, syntheticEvents: store.events.filter((event) => exampleIds.has(event.id)).length };
  }
  const db = await createSupabaseServer();
  const since = new Date(Date.now() - 180 * 86400e3).toISOString();
  const events: SiteEvent[] = [];
  for (let offset = 0; offset < MAX_EVENTS; offset += 1000) {
    const result = await db.from("site_events").select("id, session_id, event_name, page_path, product_ref, created_at").gte("created_at", since).order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 999);
    if (result.error) throw result.error;
    for (const row of result.data ?? []) events.push({ id: row.id, session: row.session_id, event: row.event_name as SiteEvent["event"], path: row.page_path, productId: row.product_ref ?? undefined, at: row.created_at });
    if ((result.data?.length ?? 0) < 1000) return { events, startedAt: events.at(-1)?.at ?? null, truncated: false, dataMode: "live" as const, syntheticEvents: 0 };
  }
  return { events, startedAt: events.at(-1)?.at ?? null, truncated: true, dataMode: "live" as const, syntheticEvents: 0 };
}
