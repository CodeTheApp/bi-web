import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsPath } from "@/shared/lib/analytics-path";
import { trackSiteEvent } from "@/shared/lib/site-events";
afterEach(() => { vi.unstubAllGlobals(); });
describe("analytics browser payload", () => {
  it("does not transmit order identifiers, query strings, or free-text product data", async () => {
    const beacon = vi.fn<(url: string, body: Blob) => boolean>(() => true);
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { doNotTrack: "0", sendBeacon: beacon });
    vi.stubGlobal("location", { pathname: "/loja/pedido/private-order-identifier", search: "?email=private@example.com" });
    vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {} });
    trackSiteEvent("purchase", { productId: "private@example.com" });
    const payload = JSON.parse(await (beacon.mock.calls[0][1] as Blob).text());
    expect(payload.path).toBe("/loja/pedido");
    expect(JSON.stringify(payload)).not.toContain("private");
    expect(payload.productId).toBeUndefined();
  });
  it("never dispatches analytics for admin/API/unknown routes", () => {
    for (const path of ["/admin", "/api/analytics", "/preview/home/hero", "/private-account/user-1"]) expect(analyticsPath(path)).toBeNull();
    expect(analyticsPath("/loja/abajur-hera")).toBe("/loja/abajur-hera");
    expect(analyticsPath("/projetos/apartamento-jr")).toBe("/projetos/apartamento-jr");
  });
});
