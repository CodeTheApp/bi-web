import { describe, expect, it, vi } from "vitest";
import { createCartStore } from "@/entities/cart/model/store";
import {
  createFavoriteStore,
  createFavoriteSync,
} from "@/entities/favorite/model/store";
import { createPostalCodeStore } from "@/entities/shipping/model/store";
import { syncPersistedValue } from "@/shared/lib/persisted-value";
import type { CartItem } from "@/entities/order";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const item: CartItem = {
  variantId: "v1",
  productId: "p1",
  slug: "pendente",
  title: "Pendente",
  label: "Dourado",
  sku: "P01",
  image: null,
  category: "pendentes",
  priceCents: 10000,
  qty: 2,
};

describe("Zustand browser persistence", () => {
  it("hydrates legacy data after the initial server snapshot and migrates without losing the bag", async () => {
    const storage = new MemoryStorage();
    storage.setItem("bi:sacola", JSON.stringify([item, { ...item, qty: 3 }]));
    const store = createCartStore(() => storage);
    expect(store.get()).toEqual([]);
    expect(store.persist.hasHydrated()).toBe(false);
    await store.hydrate();
    expect(store.get()).toEqual([{ ...item, qty: 5 }]);
    expect(store.getInitialState().value).toEqual([]);
    expect(JSON.parse(storage.getItem("bi:sacola")!)).toEqual({
      version: 1,
      state: { value: [{ ...item, qty: 5 }] },
    });
    const nextPage = createCartStore(() => storage);
    await nextPage.hydrate();
    expect(nextPage.get()).toEqual(store.get());
  });

  it("migrates favorites and CEP, stripping unrelated fields from saved cart items", async () => {
    const storage = new MemoryStorage();
    storage.setItem("bi:favoritos", '["p1","p1","p2"]');
    storage.setItem("bi:cep", '"70040010"');
    storage.setItem(
      "bi:sacola",
      JSON.stringify([
        { ...item, customer: { cpf: "private" }, token: "secret" },
      ]),
    );
    const favorites = createFavoriteStore(() => storage);
    const cep = createPostalCodeStore(() => storage);
    const cart = createCartStore(() => storage);
    await Promise.all([favorites.hydrate(), cep.hydrate(), cart.hydrate()]);
    expect(favorites.get()).toEqual(["p1", "p2"]);
    expect(cep.get()).toBe("70040010");
    expect(storage.getItem("bi:sacola")).not.toContain("private");
    expect(storage.getItem("bi:sacola")).not.toContain("secret");
  });

  it.each([
    "{oops",
    '{"state":{"value":[{"qty":0}]},"version":1}',
    '"not-a-cart"',
  ])("recovers from malformed storage: %s", async (raw) => {
    const storage = new MemoryStorage();
    storage.setItem("bi:sacola", raw);
    const store = createCartStore(() => storage);
    await store.hydrate();
    expect(store.get()).toEqual([]);
    store.set([item]);
    expect(store.get()).toEqual([item]);
  });

  it("keeps memory usable when localStorage is blocked", async () => {
    const store = createFavoriteStore(() => {
      throw new Error("SecurityError");
    });
    await store.hydrate();
    store.set(["p1"]);
    await store.hydrate();
    expect(store.get()).toEqual(["p1"]);
    expect(store.persist.hasHydrated()).toBe(true);
  });

  it("reflects another tab and localStorage.clear without writing an event loop", () => {
    const storage = new MemoryStorage();
    const store = createFavoriteStore(() => storage);
    const target = new EventTarget();
    const stop = syncPersistedValue(
      store,
      target as unknown as Pick<
        Window,
        "addEventListener" | "removeEventListener"
      >,
    );
    const write = vi.spyOn(storage, "setItem");
    storage.setItem(
      "bi:favoritos",
      JSON.stringify({ state: { value: ["p2"] }, version: 1 }),
    );
    const changed = new Event("storage");
    Object.assign(changed, { key: "bi:favoritos" });
    target.dispatchEvent(changed);
    expect(store.get()).toEqual(["p2"]);
    expect(write).toHaveBeenCalledTimes(1);
    storage.clear();
    const cleared = new Event("storage");
    Object.assign(cleared, { key: null });
    target.dispatchEvent(cleared);
    expect(store.get()).toEqual([]);
    stop();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const flush = () => new Promise((done) => setTimeout(done, 0));

describe("favorite account synchronization", () => {
  it("rolls back only the failed product, retaining a concurrent favorite", async () => {
    let ids: string[] = [];
    const failure = deferred<{ ok: boolean; error?: string }>();
    const toggle = createFavoriteSync({
      get: () => ids,
      set: (value) => {
        ids = value;
      },
      scope: () => "account-1",
      save: (id) =>
        id === "a" ? failure.promise : Promise.resolve({ ok: true }),
      onError: vi.fn(),
    });
    toggle("a");
    toggle("b");
    failure.resolve({ ok: false, error: "offline" });
    await flush();
    expect(ids).toEqual(["b"]);
  });

  it("serializes the same product and restores the last server-confirmed choice", async () => {
    let ids: string[] = [];
    const first = deferred<{ ok: boolean }>();
    const save = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ ok: false });
    const toggle = createFavoriteSync({
      get: () => ids,
      set: (value) => {
        ids = value;
      },
      scope: () => "account-1",
      save,
      onError: vi.fn(),
    });
    toggle("a");
    toggle("a");
    await flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(ids).toEqual([]);
    first.resolve({ ok: true });
    await flush();
    expect(save.mock.calls).toEqual([
      ["a", true],
      ["a", false],
    ]);
    expect(ids).toEqual(["a"]);
  });

  it("ignores an old account response after signing out", async () => {
    let ids: string[] = [];
    let account: string | null = "account-1";
    const response = deferred<{ ok: boolean }>();
    const onError = vi.fn();
    const toggle = createFavoriteSync({
      get: () => ids,
      set: (value) => {
        ids = value;
      },
      scope: () => account,
      save: () => response.promise,
      onError,
    });
    toggle("a");
    await flush();
    account = null;
    ids = ["guest-favorite"];
    response.resolve({ ok: false });
    await flush();
    expect(ids).toEqual(["guest-favorite"]);
    expect(onError).not.toHaveBeenCalled();
  });
});
