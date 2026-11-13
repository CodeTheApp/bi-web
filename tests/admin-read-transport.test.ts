import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOrders,
  getOrderAdmin,
  getStock,
  getStockMoves,
  getList,
} from "@/shared/api/admin-reads";
const fetcher = vi.fn();
afterEach(() => {
  vi.unstubAllGlobals();
  fetcher.mockReset();
});
describe("administrative read transport", () => {
  it("uses credentialed independent GET requests with no-store and an optional AbortSignal", async () => {
    vi.stubGlobal(
      "fetch",
      fetcher.mockResolvedValue(Response.json({ ok: true, data: [] })),
    );
    const controller = new AbortController();
    expect(
      await getOrderAdmin("order-id", { signal: controller.signal }),
    ).toEqual({ ok: true, data: [] });
    const [path, options] = fetcher.mock.calls[0];
    expect(new URL(path, "https://example.test").searchParams.get("args")).toBe(
      '["order-id"]',
    );
    expect(options).toMatchObject({
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    expect(options.body).toBeUndefined();
  });
  it("starts multiple reads before either resolves rather than serializing them", async () => {
    let complete: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      complete = resolve;
    });
    vi.stubGlobal(
      "fetch",
      fetcher.mockImplementation(async () => {
        await pending;
        return Response.json({ ok: true, data: [] });
      }),
    );
    const orders = getOrders();
    const stock = getStock();
    expect(fetcher).toHaveBeenCalledTimes(2);
    complete!();
    await Promise.all([orders, stock]);
  });
  it("preserves optional arguments and forwards valid discriminants as JSON tuples", async () => {
    vi.stubGlobal(
      "fetch",
      fetcher.mockImplementation(async () =>
        Response.json({ ok: true, data: [] }),
      ),
    );
    await getStockMoves(undefined, { signal: new AbortController().signal });
    await getList("faqs");
    expect(
      new URL(
        fetcher.mock.calls[0][0],
        "https://example.test",
      ).searchParams.get("args"),
    ).toBe("[]");
    expect(
      new URL(
        fetcher.mock.calls[1][0],
        "https://example.test",
      ).searchParams.get("args"),
    ).toBe('["faqs"]');
  });
  it("keeps server error envelopes and handles non-JSON/network failures without leaking their contents", async () => {
    vi.stubGlobal(
      "fetch",
      fetcher
        .mockResolvedValueOnce(
          Response.json(
            { ok: false, error: "Sessão expirada" },
            { status: 401 },
          ),
        )
        .mockResolvedValueOnce(
          new Response("private html diagnostic", { status: 500 }),
        )
        .mockRejectedValueOnce(new Error("secret diagnostic")),
    );
    expect(await getOrders()).toEqual({ ok: false, error: "Sessão expirada" });
    expect(await getOrders()).toEqual({
      ok: false,
      error: "Resposta inválida ao carregar os dados. Tente novamente.",
    });
    expect(await getOrders()).toEqual({
      ok: false,
      error: "Não foi possível conectar ao painel. Tente novamente.",
    });
  });
  it("preserves fetch cancellation for TanStack Query", async () => {
    const error = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", fetcher.mockRejectedValue(error));
    await expect(getOrders({ signal: AbortSignal.abort() })).rejects.toBe(
      error,
    );
  });
});
