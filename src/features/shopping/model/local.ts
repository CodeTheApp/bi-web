"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { cartStore as cart } from "@/entities/cart";
import { favoriteStore } from "@/entities/favorite";
import { couponCodeStore } from "@/entities/coupon";
import { postalCodeStore } from "@/entities/shipping";
import {
  createPersistedValue,
  syncPersistedValue,
} from "@/shared/lib/persisted-value";

/** Compatibility boundary; persistence lives in the entity models. */
function withHook<T>(store: ReturnType<typeof createPersistedValue<T>>) {
  function useValue() {
    const value = useStore(store, (state) => state.value);
    useEffect(() => syncPersistedValue(store), []);
    return value;
  }
  return Object.assign(store, { use: useValue });
}

export const cartStore = withHook(cart);
export const favStore = withHook(favoriteStore);
export const cepStore = withHook(postalCodeStore);
export const couponStore = withHook(couponCodeStore);

const subscribeShopHydration = (onChange: () => void) => {
  const stopCart = cart.persist.onFinishHydration(onChange);
  const stopFavorites = favoriteStore.persist.onFinishHydration(onChange);
  return () => {
    stopCart();
    stopFavorites();
  };
};
const shopHydrated = () =>
  cart.persist.hasHydrated() && favoriteStore.persist.hasHydrated();
export const useShopStorageReady = () =>
  useSyncExternalStore(subscribeShopHydration, shopHydrated, () => false);

const noop = () => () => {};
/** Also used by dates and browser-only details outside persisted entities. */
export const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
