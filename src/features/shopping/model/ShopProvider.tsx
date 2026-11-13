"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  cartCount,
  cartSubtotal,
  type CartItem,
  type Customer,
} from "@/entities/order";
import {
  shopSession,
  setFavorite,
  signOutCustomer,
} from "@/server/shop/actions";
import {
  cartStore,
  favStore,
  couponStore,
  useShopStorageReady,
} from "@/features/shopping/model/local";
import { addCartItem, setCartQuantity } from "@/entities/cart";
import { createFavoriteSync } from "@/entities/favorite";
import { trackSiteEvent } from "@/shared/lib/site-events";
import { notify } from "@/shared/lib/notify";
import {
  normalizeStorePreferences,
  type StorePreferences,
} from "@/entities/store-settings";

/**
 * Estado da loja no navegador: sacola, favoritos, sessão do cliente e as camadas (sacola e entrar).
 * A sacola mora no navegador (como em qualquer loja); favoritos vão para a conta quando a pessoa entra.
 */
type LoginRequest = {
  title?: string;
  reason?: string;
  then?: (c: Customer) => void;
};
/** Pedido de login aberto (ou o último, enquanto a janela fecha): `id` recria o formulário a cada abertura. */
type LoginState = LoginRequest & { id: number; open: boolean };

type Shop = {
  storePreferences: StorePreferences;
  /** Sacola e favoritos do navegador já lidos. */
  ready: boolean;
  /** O servidor já respondeu quem está logado. */
  loaded: boolean;
  demo: boolean;
  customer: Customer | null;
  items: CartItem[];
  count: number;
  subtotal: number;
  couponCode: string;
  setCouponCode: (value: string) => void;
  add: (item: CartItem) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  favorites: string[];
  isFav: (productId: string) => boolean;
  toggleFav: (productId: string) => void;
  signedIn: (c: Customer, favorites: string[]) => void;
  setCustomer: (c: Customer) => void;
  signOut: () => Promise<void>;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  login: LoginState | null;
  openLogin: (r?: LoginRequest) => void;
  closeLogin: () => void;
  /** A última variante que entrou na sacola (para o brilho). */
  flash: string | null;
  say: (msg: string) => void;
};

const Ctx = createContext<Shop | null>(null);

export function useShop() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useShop fora do ShopProvider");
  return s;
}

export function ShopProvider({
  children,
  storePreferences,
}: {
  children: ReactNode;
  storePreferences?: StorePreferences;
}) {
  const preferences = useMemo(
    () => normalizeStorePreferences(storePreferences),
    [storePreferences],
  );
  const ready = useShopStorageReady();
  const items = cartStore.use();
  const favorites = favStore.use();
  const couponCode = couponStore.use();
  const [loaded, setLoaded] = useState(false);
  const [demo, setDemo] = useState(false);
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [login, setLogin] = useState<LoginState | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const customerRef = useRef<Customer | null>(null);
  const accountRevision = useRef(0);
  const timers = useRef<{
    flash?: ReturnType<typeof setTimeout>;
  }>({});

  // pergunta ao servidor quem está logado; logado, os favoritos da conta passam a valer também aqui
  useEffect(() => {
    let alive = true;
    const revision = accountRevision.current;
    shopSession()
      .then((r) => {
        if (!alive || revision !== accountRevision.current) return;
        setLoaded(true);
        if (!r.ok) return;
        setDemo(r.data.demo);
        customerRef.current = r.data.customer;
        setCustomerState(r.data.customer);
        if (r.data.customer) favStore.set(r.data.favorites);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const commitItems = useCallback(
    (fn: (cur: CartItem[]) => CartItem[]) => cartStore.set(fn(cartStore.get())),
    [],
  );

  const say = useCallback((msg: string) => notify(msg), []);
  const favoriteSync = useRef<ReturnType<typeof createFavoriteSync> | null>(
    null,
  );

  useEffect(
    () => () => {
      clearTimeout(timers.current.flash);
      accountRevision.current++;
      customerRef.current = null;
    },
    [],
  );

  const add = useCallback((item: CartItem) => {
    addCartItem(item);
    trackSiteEvent("add_to_cart", { productId: item.productId });
    clearTimeout(timers.current.flash);
    setFlash(item.variantId);
    timers.current.flash = setTimeout(() => setFlash(null), 2400);
    setCartOpen(true);
  }, []);
  const setQty = useCallback(
    (id: string, qty: number) => setCartQuantity(id, qty),
    [],
  );
  const remove = useCallback(
    (id: string) => commitItems((cur) => cur.filter((i) => i.variantId !== id)),
    [commitItems],
  );
  const clear = useCallback(() => {
    commitItems(() => []);
    couponStore.set("");
  }, [commitItems]);
  const setCouponCode = useCallback(
    (value: string) => couponStore.set(value.trim().toUpperCase().slice(0, 40)),
    [],
  );

  const toggleFav = useCallback(
    (id: string) => {
      if (!favStore.persist.hasHydrated()) void favStore.hydrate();
      favoriteSync.current ??= createFavoriteSync({
        get: favStore.get,
        set: favStore.set,
        scope: () =>
          customerRef.current
            ? `${accountRevision.current}:${customerRef.current.id}`
            : null,
        save: setFavorite,
        onError: say,
      });
      const on = favoriteSync.current(id);
      if (on) trackSiteEvent("favorite", { productId: id });
      say(
        on
          ? customerRef.current
            ? "Salvo nos favoritos"
            : "Salvo nos favoritos deste navegador. Entre para guardar na sua conta."
          : "Tirado dos favoritos",
      );
    },
    [say],
  );

  const signedIn = useCallback((c: Customer, favs: string[]) => {
    accountRevision.current++;
    setLoaded(true);
    customerRef.current = c;
    setCustomerState(c);
    favStore.set(favs);
  }, []);
  const setCustomer = useCallback((c: Customer) => {
    customerRef.current = c;
    setCustomerState(c);
  }, []);
  const signOut = useCallback(async () => {
    await signOutCustomer();
    accountRevision.current++;
    customerRef.current = null;
    setCustomerState(null);
    favStore.set([]);
    say("Você saiu da sua conta");
  }, [say]);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openLogin = useCallback((r: LoginRequest = {}) => {
    setCartOpen(false);
    setLogin({ ...r, id: Date.now(), open: true });
  }, []);
  const closeLogin = useCallback(
    () => setLogin((cur) => (cur ? { ...cur, open: false } : cur)),
    [],
  );
  const isFav = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  const value = useMemo<Shop>(
    () => ({
      storePreferences: preferences,
      ready,
      loaded,
      demo,
      customer,
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      couponCode,
      setCouponCode,
      add,
      setQty,
      remove,
      clear,
      favorites,
      isFav,
      toggleFav,
      signedIn,
      setCustomer,
      signOut,
      cartOpen,
      openCart,
      closeCart,
      login,
      openLogin,
      closeLogin,
      flash,
      say,
    }),
    [
      preferences,
      ready,
      loaded,
      demo,
      customer,
      items,
      couponCode,
      setCouponCode,
      add,
      setQty,
      remove,
      clear,
      favorites,
      isFav,
      toggleFav,
      signedIn,
      setCustomer,
      signOut,
      cartOpen,
      openCart,
      closeCart,
      login,
      openLogin,
      closeLogin,
      flash,
      say,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
