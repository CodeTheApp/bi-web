import { createStore } from "zustand/vanilla";
import { persist, type PersistStorage } from "zustand/middleware";
import type { z } from "zod";

type ValueState<T> = { value: T; replace: (value: T) => void };
type SavedValue<T> = { value: T };
type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The storage boundary also accepts the old, unwrapped JSON values. */
export function createPersistedValue<T>({
  key,
  schema,
  fallback,
  storage = () => localStorage,
}: {
  key: string;
  schema: z.ZodType<T>;
  fallback: T;
  storage?: () => BrowserStorage;
}) {
  const valid = (input: unknown) => {
    const parsed = schema.safeParse(input);
    return parsed.success ? parsed.data : fallback;
  };
  let memory: T = fallback;
  const persistence: PersistStorage<SavedValue<T>> = {
    getItem: () => {
      let value = memory;
      let legacy = false;
      try {
        const raw = storage().getItem(key);
        const parsed: unknown = raw == null ? fallback : JSON.parse(raw);
        const saved =
          parsed && typeof parsed === "object" && "state" in parsed
            ? (parsed as { state: unknown }).state
            : null;
        legacy = raw != null && saved == null;
        value = valid(
          saved && typeof saved === "object" && "value" in saved
            ? saved.value
            : parsed,
        );
      } catch {
        // Unavailable storage keeps memory; malformed JSON starts empty.
        try {
          storage().getItem(key);
          value = fallback;
        } catch {
          /* private browsing / unavailable storage */
        }
      }
      memory = value;
      return { state: { value }, version: legacy ? 0 : 1 };
    },
    setItem: (_name, saved) => {
      memory = valid(saved.state.value);
      try {
        storage().setItem(
          key,
          JSON.stringify({ state: { value: memory }, version: 1 }),
        );
      } catch {
        /* Remains usable when the browser refuses persistence. */
      }
    },
    removeItem: () => {
      memory = fallback;
      try {
        storage().removeItem(key);
      } catch {
        /* no persistent storage */
      }
    },
  };
  const store = createStore<ValueState<T>>()(
    persist(
      (set) => ({
        value: fallback,
        replace: (value) => set({ value: valid(value) }),
      }),
      {
        name: key,
        version: 1,
        storage: persistence,
        partialize: ({ value }) => ({ value }),
        migrate: (saved) => ({
          value: valid((saved as SavedValue<T> | undefined)?.value),
        }),
        merge: (saved, current) => ({
          ...current,
          value: valid((saved as SavedValue<T> | undefined)?.value),
        }),
        // The first browser render matches the server's empty snapshot.
        skipHydration: true,
      },
    ),
  );
  return Object.assign(store, {
    key,
    hydrate: () => store.persist.rehydrate(),
    get: () => store.getState().value,
    set: (value: T) => store.getState().replace(value),
  });
}

/** Rehydration never writes back, avoiding an event loop between tabs. */
export function syncPersistedValue<T>(
  store: ReturnType<typeof createPersistedValue<T>>,
  target: Pick<Window, "addEventListener" | "removeEventListener"> = window,
) {
  if (!store.persist.hasHydrated()) void store.hydrate();
  const update = (event: StorageEvent) => {
    if (event.key === null || event.key === store.key) void store.hydrate();
  };
  target.addEventListener("storage", update);
  return () => target.removeEventListener("storage", update);
}
