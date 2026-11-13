import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  ctx: vi.fn(),
  read: vi.fn(),
  thread: vi.fn(),
  markRead: vi.fn(),
  mutation: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/admin/guard", () => ({
  ctx: state.ctx,
  run: async (fn: () => Promise<unknown>) => ({ ok: true, data: await fn() }),
}));
vi.mock("@/server/admin/actions", () => ({
  ...Object.fromEntries(
    [
      "getDashboard",
      "getSections",
      "getProjects",
      "getProject",
      "getMedia",
      "getMediaCategories",
      "getList",
      "getThreads",
      "getSettings",
    ].map((name) => [name, (...args: unknown[]) => state.read(name, ...args)]),
  ),
  getThread: state.mutation,
  deleteMedia: state.mutation,
}));
vi.mock("@/server/catalog/actions", () =>
  Object.fromEntries(
    ["getProducts", "getProductAdmin", "getStock", "getStockMoves"].map(
      (name) => [name, (...args: unknown[]) => state.read(name, ...args)],
    ),
  ),
);
vi.mock("@/server/shop/admin-actions", () =>
  Object.fromEntries(
    ["getOrders", "getOrderAdmin", "getCustomers"].map((name) => [
      name,
      (...args: unknown[]) => state.read(name, ...args),
    ]),
  ),
);
vi.mock("@/server/shop/customer-actions", () =>
  Object.fromEntries(
    ["getCustomerAdmin", "getCustomerOrdersAdmin"].map((name) => [
      name,
      (...args: unknown[]) => state.read(name, ...args),
    ]),
  ),
);
vi.mock("@/entities/coupon/api/actions", () => ({
  getCoupons: (...args: unknown[]) => state.read("getCoupons", ...args),
}));
vi.mock("@/entities/shop-analytics/api/actions", () => ({
  getShopAnalytics: (...args: unknown[]) =>
    state.read("getShopAnalytics", ...args),
}));
vi.mock("@/server/analytics/actions", () => ({
  getSiteAnalytics: (...args: unknown[]) =>
    state.read("getSiteAnalytics", ...args),
}));
vi.mock("@/features/demo-workspace/api/actions", () => ({
  getDemoWorkspace: (...args: unknown[]) =>
    state.read("getDemoWorkspace", ...args),
}));
vi.mock("@/server/admin-notifications/actions", () => ({
  getAdminNotificationContext: (...args: unknown[]) =>
    state.read("getAdminNotificationContext", ...args),
  getAdminNotifications: (...args: unknown[]) =>
    state.read("getAdminNotifications", ...args),
}));
import { readAdminResource } from "@/server/admin/read";
import { GET } from "@/app/api/admin/read/[resource]/route";

beforeEach(() => {
  vi.clearAllMocks();
  state.ctx.mockResolvedValue({
    me: { id: "staff", role: "editor" },
    repo: { thread: state.thread, markRead: state.markRead },
  });
  state.read.mockImplementation(async (name: string) => ({
    ok: true,
    data: { resource: name },
  }));
  state.thread.mockResolvedValue({ id: "thread-id", unread: true });
});
const request = (resource: string, query = "") =>
  GET(new Request(`https://example.test/api/admin/read/${resource}${query}`), {
    params: Promise.resolve({ resource }),
  });
describe("private administrative GET gateway", () => {
  it("authenticates every request before dispatch or parameter errors", async () => {
    state.ctx.mockRejectedValue(new Error("private diagnostic"));
    for (const resource of ["getOrders", "deleteMedia", "unknown"]) {
      const result = await readAdminResource(resource, null);
      expect(result.status).toBe(401);
      expect(result.result).toEqual({
        ok: false,
        error: "Sessão expirada. Entre de novo.",
      });
    }
    expect(state.read).not.toHaveBeenCalled();
    expect(state.mutation).not.toHaveBeenCalled();
  });
  it("uses a closed whitelist and cannot dispatch a mutation or prototype name", async () => {
    expect((await readAdminResource("deleteMedia", ["media-id"])).status).toBe(
      404,
    );
    expect((await readAdminResource("__proto__", [])).status).toBe(404);
    expect(state.mutation).not.toHaveBeenCalled();
    expect(state.read).not.toHaveBeenCalled();
  });
  it("validates tuple arity, IDs and list kinds before invoking a reader", async () => {
    for (const [name, args] of [
      ["getOrders", ["extra"]],
      ["getOrderAdmin", []],
      ["getOrderAdmin", ["../private"]],
      ["getList", ["unknown"]],
      ["getStockMoves", [null]],
    ] as const)
      expect((await readAdminResource(name, args)).status).toBe(400);
    expect(state.read).not.toHaveBeenCalled();
    expect((await readAdminResource("getStockMoves", [])).status).toBe(200);
    expect(state.read).toHaveBeenCalledWith("getStockMoves");
  });
  it("preserves read action Result envelopes and product getter compatibility", async () => {
    const expected = { ok: false, error: "Cliente não encontrado." };
    state.read.mockResolvedValueOnce(expected);
    expect(
      await readAdminResource("getCustomerAdmin", ["customer-id"]),
    ).toEqual({ status: 200, result: expected });
    await readAdminResource("getProductAdmin", ["product-id"]);
    await readAdminResource("getProduct", ["product-id"]);
    expect(state.read).toHaveBeenLastCalledWith(
      "getProductAdmin",
      "product-id",
    );
  });
  it("reads an unread thread without marking it or invoking the legacy mutating action", async () => {
    expect(await readAdminResource("getThread", ["thread-id"])).toEqual({
      status: 200,
      result: { ok: true, data: { id: "thread-id", unread: true } },
    });
    expect(state.thread).toHaveBeenCalledWith("thread-id");
    expect(state.markRead).not.toHaveBeenCalled();
    expect(state.mutation).not.toHaveBeenCalled();
  });
  it("rejects malformed, duplicate, oversized and unknown query parameters with private no-store headers", async () => {
    for (const query of [
      "?args=bad-json",
      "?args=[]&args=[]",
      `?args=${"x".repeat(4097)}`,
      "?method=delete&args=[]",
    ]) {
      const response = await request("getOrders", query);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toContain("private");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.headers.get("Vary")).toBe("Cookie");
      expect((await response.json()).ok).toBe(false);
    }
    expect(state.read).not.toHaveBeenCalled();
  });
  it("returns the same private envelope on successful and unauthenticated requests", async () => {
    const response = await request("getOrders");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { resource: "getOrders" },
    });
    state.ctx.mockRejectedValueOnce(new Error("expired"));
    const denied = await request("getOrders");
    expect(denied.status).toBe(401);
    expect(denied.headers.get("Cache-Control")).toContain("no-store");
  });
});
