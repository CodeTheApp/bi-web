import { z } from "zod";
import { createPersistedValue } from "@/shared/lib/persisted-value";

const favoritesSchema = z
  .array(z.string().min(1).max(200))
  .max(500)
  .transform((ids) => [...new Set(ids)]);
export const createFavoriteStore = (storage?: () => Storage) =>
  createPersistedValue({
    key: "bi:favoritos",
    schema: favoritesSchema,
    fallback: [] as string[],
    storage,
  });
export const favoriteStore = createFavoriteStore();

/** A failed response must not undo a newer click or another product. */
export function createFavoriteSync({
  get,
  set,
  scope,
  save,
  onError,
}: {
  get: () => string[];
  set: (ids: string[]) => void;
  scope: () => string | null;
  save: (id: string, on: boolean) => Promise<{ ok: boolean; error?: string }>;
  onError: (message: string) => void;
}) {
  const pending = new Map<
    string,
    {
      version: number;
      confirmed: boolean;
      account: string;
      tail: Promise<void>;
    }
  >();
  return (id: string) => {
    const before = get().includes(id);
    const on = !before;
    set(on ? [...get(), id] : get().filter((value) => value !== id));
    const account = scope();
    if (!account) return on;
    const previous = pending.get(id);
    const job =
      previous?.account === account
        ? previous
        : { version: 0, confirmed: before, account, tail: Promise.resolve() };
    const version = ++job.version;
    pending.set(id, job);
    job.tail = job.tail.then(async () => {
      if (scope() !== account) {
        if (job.version === version && pending.get(id) === job)
          pending.delete(id);
        return;
      }
      let result: { ok: boolean; error?: string };
      try {
        result = await save(id, on);
      } catch {
        result = {
          ok: false,
          error: "Não foi possível atualizar os favoritos. Tente novamente.",
        };
      }
      if (result.ok) job.confirmed = on;
      if (scope() !== account) {
        if (job.version === version && pending.get(id) === job)
          pending.delete(id);
        return;
      }
      if (job.version !== version || pending.get(id) !== job) return;
      if (!result.ok) {
        const current = get();
        // Another tab may already have superseded this request.
        if (current.includes(id) === on)
          set(
            job.confirmed
              ? [...new Set([...current, id])]
              : current.filter((value) => value !== id),
          );
        onError(
          result.error ||
            "Não foi possível atualizar os favoritos. Tente novamente.",
        );
      }
      pending.delete(id);
    });
    return on;
  };
}
