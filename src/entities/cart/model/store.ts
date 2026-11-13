import { z } from "zod";
import { cartItemSchema, type CartItem } from "@/entities/order";
import { createPersistedValue } from "@/shared/lib/persisted-value";

const cartSchema = z
  .array(cartItemSchema)
  .max(60)
  .transform((items) => {
    const unique = new Map<string, CartItem>();
    for (const item of items) {
      const previous = unique.get(item.variantId);
      unique.set(
        item.variantId,
        previous
          ? { ...item, qty: Math.min(99, previous.qty + item.qty) }
          : item,
      );
    }
    return [...unique.values()];
  });

export const createCartStore = (storage?: () => Storage) =>
  createPersistedValue({
    key: "bi:sacola",
    schema: cartSchema,
    fallback: [] as CartItem[],
    storage,
  });
export const cartStore = createCartStore();

export function addCartItem(item: CartItem) {
  if (!cartStore.persist.hasHydrated()) void cartStore.hydrate();
  const current = cartStore.get();
  const previous = current.find((line) => line.variantId === item.variantId);
  if (previous)
    cartStore.set(
      current.map((line) =>
        line === previous
          ? { ...item, qty: Math.min(99, previous.qty + item.qty) }
          : line,
      ),
    );
  else if (current.length < 60) cartStore.set([...current, item]);
}

export function setCartQuantity(id: string, qty: number) {
  if (!cartStore.persist.hasHydrated()) void cartStore.hydrate();
  if (!Number.isFinite(qty)) return;
  cartStore.set(
    cartStore
      .get()
      .map((line) =>
        line.variantId === id
          ? { ...line, qty: Math.max(1, Math.min(99, Math.trunc(qty))) }
          : line,
      ),
  );
}
