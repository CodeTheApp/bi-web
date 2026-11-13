import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ ctx: vi.fn(), orders: vi.fn(), getRepo: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({ ctx: auth.ctx, run: async (fn: () => Promise<unknown>) => { try { return { ok: true, data: await fn() }; } catch (error) { return { ok: false, error: (error as Error).message }; } } }));
vi.mock("@/server/shop/repo", () => ({ getShopRepo: auth.getRepo }));
import { getShopAnalytics } from "@/entities/shop-analytics/api/actions";

describe("analytics server authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getRepo.mockResolvedValue({ analyticsOrders: auth.orders });
    auth.orders.mockResolvedValue([]);
  });

  it("requires a staff context before reading order data", async () => {
    auth.ctx.mockRejectedValueOnce(new Error("Acesso não autorizado."));
    expect(await getShopAnalytics()).toEqual({ ok: false, error: "Acesso não autorizado." });
    expect(auth.getRepo).not.toHaveBeenCalled();
    expect(auth.orders).not.toHaveBeenCalled();
  });

  it("returns actual empty results for authorized staff", async () => {
    auth.ctx.mockResolvedValueOnce({});
    const result = await getShopAnalytics();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ orders: [], generatedAt: expect.any(String) });
    expect(auth.orders).toHaveBeenCalledOnce();
  });
});
