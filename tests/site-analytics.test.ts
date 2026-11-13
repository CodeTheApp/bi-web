import { describe, expect, it } from "vitest";
import { siteEventSchema, trafficSummary, type SiteEvent } from "@/entities/site-analytics";
const base = { id: "89a0e285-7cf5-4c36-91c5-85f0b95a301a", session: "ff6a7fe1-40de-4aee-9bfc-f6de715d28a8", path: "/loja", event: "page_view" as const };
describe("anonymous first-party analytics", () => {
  it("rejects admin pages, queries and customer fields", () => {
    for (const path of ["/admin", "/admin/midia", "/api/x", "/preview/home/hero", "/?email=a@example.com"]) expect(siteEventSchema.safeParse({ ...base, path }).success).toBe(false);
    expect(siteEventSchema.safeParse({ ...base, email: "a@example.com" }).success).toBe(false);
  });
  it("groups private order routes without storing order identifiers", () => { expect(siteEventSchema.parse({ ...base, path: "/loja/pedido/very-private-order" }).path).toBe("/loja/pedido"); });
  it("counts sessions and events in Brasília's calendar day", () => {
    const events: SiteEvent[] = [{ ...base, at: "2026-11-13T01:00:00Z" }, { ...base, id: "2", event: "add_to_cart", at: "2026-11-13T01:00:00Z" }, { ...base, id: "3", session: "another", path: "/", at: "2026-11-13T04:00:00Z" }];
    const summary = trafficSummary(events, { from: "2026-11-12", to: "2026-11-12" });
    expect(summary.sessions).toBe(1); expect(summary.counts.page_view).toBe(1); expect(summary.counts.add_to_cart).toBe(1); expect(summary.pages).toEqual([{ path: "/loja", views: 1 }]);
    expect(trafficSummary(events, { from: null, to: null, error: "invalid" }).total).toBe(0);
  });
});

describe("analytics path minimization", () => {
  it("masks private account routes and rejects unrecognized paths or free-text product references", () => {
    expect(siteEventSchema.parse({ ...base, path: "/conta/entrar/retorno" }).path).toBe("/conta");
    expect(siteEventSchema.parse({ ...base, path: "/loja/pedido/private-id/" }).path).toBe("/loja/pedido");
    for (const path of ["/customer/private@email.com", "/loja/a%40private.com", "/projetos/../admin", "/unknown/customer-id"]) expect(siteEventSchema.safeParse({ ...base, path }).success).toBe(false);
    expect(siteEventSchema.safeParse({ ...base, productId: "private@example.com" }).success).toBe(false);
  });
});
