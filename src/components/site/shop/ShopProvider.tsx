"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cartCount, cartSubtotal, type CartItem, type Customer } from "@/lib/shop/types";
import { shopSession, setFavorite, signOutCustomer } from "@/server/shop/actions";
import { cartStore, favStore, useHydrated } from "./local";

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
  /** Sacola e favoritos do navegador já lidos. */
  ready: boolean;
  /** O servidor já respondeu quem está logado. */
  loaded: boolean;
  demo: boolean;
  customer: Customer | null;
  items: CartItem[];
  count: number;
  subtotal: number;
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
  toast: string | null;
  say: (msg: string) => void;
};

const Ctx = createContext<Shop | null>(null);

export function useShop() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useShop fora do ShopProvider");
  return s;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const ready = useHydrated();
  const items = cartStore.use();
  const favorites = favStore.use();
  const [loaded, setLoaded] = useState(false);
  const [demo, setDemo] = useState(false);
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [login, setLogin] = useState<LoginState | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const customerRef = useRef<Customer | null>(null);
  const timers = useRef<{
    flash?: ReturnType<typeof setTimeout>;
    toast?: ReturnType<typeof setTimeout>;
  }>({});

  // pergunta ao servidor quem está logado; logado, os favoritos da conta passam a valer também aqui
  useEffect(() => {
    let alive = true;
    shopSession().then((r) => {
      if (!alive) return;
      setLoaded(true);
      if (!r.ok) return;
      setDemo(r.data.demo);
      customerRef.current = r.data.customer;
      setCustomerState(r.data.customer);
      if (r.data.customer) favStore.set(r.data.favorites);
    });
    return () => {
      alive = false;
    };
  }, []);

  const commitItems = useCallback((fn: (cur: CartItem[]) => CartItem[]) => cartStore.set(fn(cartStore.get())), []);

  const say = useCallback((msg: string) => {
    clearTimeout(timers.current.toast);
    setToast(msg);
    timers.current.toast = setTimeout(() => setToast(null), 3200);
  }, []);

  const add = useCallback(
    (item: CartItem) => {
      commitItems((cur) => {
        const hit = cur.find((i) => i.variantId === item.variantId);
        if (hit) return cur.map((i) => (i === hit ? { ...i, ...item, qty: Math.min(99, i.qty + item.qty) } : i));
        return [...cur, item];
      });
      clearTimeout(timers.current.flash);
      setFlash(item.variantId);
      timers.current.flash = setTimeout(() => setFlash(null), 2400);
      setCartOpen(true);
    },
    [commitItems],
  );
  const setQty = useCallback((id: string, qty: number) => commitItems((cur) => cur.map((i) => (i.variantId === id ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i))), [commitItems]);
  const remove = useCallback((id: string) => commitItems((cur) => cur.filter((i) => i.variantId !== id)), [commitItems]);
  const clear = useCallback(() => commitItems(() => []), [commitItems]);

  const toggleFav = useCallback(
    (id: string) => {
      const cur = favStore.get();
      const on = !cur.includes(id);
      favStore.set(on ? [...cur, id] : cur.filter((x) => x !== id));
      if (customerRef.current) {
        setFavorite(id, on).then((r) => {
          if (r.ok) return;
          say(r.error);
          favStore.set(cur);
        });
      }
      say(on ? (customerRef.current ? "Salvo nos favoritos" : "Salvo nos favoritos deste navegador. Entre para guardar na sua conta.") : "Tirado dos favoritos");
    },
    [say],
  );

  const signedIn = useCallback((c: Customer, favs: string[]) => {
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
  const closeLogin = useCallback(() => setLogin((cur) => (cur ? { ...cur, open: false } : cur)), []);
  const isFav = useCallback((id: string) => favorites.includes(id), [favorites]);

  const value = useMemo<Shop>(
    () => ({
      ready,
      loaded,
      demo,
      customer,
      items,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
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
      toast,
      say,
    }),
    [
      ready,
      loaded,
      demo,
      customer,
      items,
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
      toast,
      say,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
