import "server-only";
import { couponDiscount, type Coupon } from "@/entities/coupon";
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { orderSummary, type Customer, type Order } from "@/entities/order";
import { readDemo, writeDemoSoon } from "../demo-file";
import type { ShopRepo } from "./repo";
import { demoAllowed } from "@/server/admin/repo";
import { catalogStore } from "@/server/catalog/store";
import {
  demoWorkspaceKey,
  getDemoDataMode,
  type DemoDataMode,
} from "@/server/demo-workspace";
import { seedDemoCommerce, type CommerceFixtureState } from "./demo-fixtures";

/**
 * Loja em demonstração: workspaces isolados, preservando o arquivo original demo-loja.json.
 * O login por código não manda e-mail: o código aparece na tela. O "Google" entra com o e-mail informado.
 */
type State = CommerceFixtureState & {
  secret: string;
  seq: number;
  customers: Customer[];
  favorites: Record<string, string[]>;
  orders: Order[];
  coupons: Coupon[];
};
const FILE = "demo-loja.json";
const COOKIE = "bi_cliente";
const g = globalThis as unknown as {
  __biShop?: State;
  __biShopWorkspaces?: Map<string, State>;
  __biWorkspaceCodes?: Map<
    string,
    Map<string, { code: string; exp: number; tries: number }>
  >;
};
const workspaceFile = (mode: DemoDataMode) =>
  `demo-workspace-shop-${mode}.json`;

function originalState(): State {
  if (g.__biShop) return { ...g.__biShop, coupons: g.__biShop.coupons ?? [] };
  const saved = readDemo<State>(FILE);
  g.__biShop = {
    secret: saved?.secret ?? randomBytes(24).toString("hex"),
    seq: saved?.seq ?? 1000,
    customers: saved?.customers ?? [],
    favorites: saved?.favorites ?? {},
    orders: saved?.orders ?? [],
    coupons: saved?.coupons ?? [],
  };
  return g.__biShop;
}

function state(mode: DemoDataMode): State {
  const stores = (g.__biShopWorkspaces ??= new Map());
  const key = demoWorkspaceKey("shop", mode);
  const existing = stores.get(key);
  if (existing) return existing;
  const saved = readDemo<State>(workspaceFile(mode));
  const S: State = saved
    ? { ...saved, coupons: saved.coupons ?? [] }
    : mode === "examples"
      ? clone(originalState())
      : {
          secret: randomBytes(24).toString("hex"),
          seq: 1000,
          customers: [],
          favorites: {},
          orders: [],
          coupons: [],
        };
  stores.set(key, S);
  if (mode === "examples" && seedDemoCommerce(S, catalogStore(mode).products))
    writeDemoSoon(workspaceFile(mode), () => S);
  return S;
}

const clone = <T>(x: T): T => structuredClone(x);

export function demoShop(): ShopRepo {
  if (!demoAllowed())
    throw new Error("Demonstração indisponível neste ambiente.");
  const mode = getDemoDataMode();
  const S = state(mode);
  const save = () => writeDemoSoon(workspaceFile(mode), () => S);
  const workspaceCodes = (g.__biWorkspaceCodes ??= new Map());
  const codeKey = demoWorkspaceKey("shop-codes", mode);
  const codeStore = workspaceCodes.get(codeKey) ?? new Map();
  workspaceCodes.set(codeKey, codeStore);
  const codes = () => codeStore;
  const sign = (id: string) =>
    `${id}.${createHmac("sha256", S.secret).update(id).digest("base64url")}`;
  const verify = (token: string | undefined) => {
    if (!token) return null;
    const id = token.slice(0, token.lastIndexOf("."));
    const a = Buffer.from(sign(id));
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b) ? id : null;
  };
  const startSession = async (customer: Customer) => {
    (await cookies()).set(COOKIE, sign(customer.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  };
  const upsertCustomer = (
    email: string,
    provider: Customer["provider"],
    name = "",
  ) => {
    const e = email.trim().toLowerCase();
    let customer = S.customers.find((item) => item.email === e);
    if (!customer) {
      customer = {
        id: crypto.randomUUID(),
        email: e,
        name,
        phone: "",
        cpf: "",
        provider,
        createdAt: new Date().toISOString(),
        addresses: [],
      };
      S.customers.push(customer);
    } else if (name && !customer.name) customer.name = name;
    save();
    return customer;
  };
  const current = async () => {
    const id = verify((await cookies()).get(COOKIE)?.value);
    return id ? (S.customers.find((c) => c.id === id) ?? null) : null;
  };
  const mustMe = async () => {
    const c = await current();
    if (!c) throw new Error("Entre na sua conta para continuar.");
    return c;
  };
  return {
    mode: "demo",

    async sendCode(email) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      codes().set(email.trim().toLowerCase(), {
        code,
        exp: Date.now() + 10 * 60_000,
        tries: 0,
      });
      return { demoCode: code };
    },
    async verifyCode(email, code) {
      const e = email.trim().toLowerCase();
      const hit = codes().get(e);
      if (!hit || hit.exp < Date.now())
        throw new Error("O código expirou. Peça um novo.");
      if (++hit.tries > 5)
        throw new Error("Muitas tentativas. Peça um novo código.");
      if (hit.code !== code.trim())
        throw new Error("Código incorreto. Confira e tente de novo.");
      codes().delete(e);
      const c = upsertCustomer(e, "email");
      await startSession(c);
      return clone(c);
    },
    async google(_next, demoEmail, demoName) {
      if (!demoEmail) throw new Error("Informe o e-mail da conta Google.");
      const c = upsertCustomer(demoEmail, "google", demoName);
      await startSession(c);
      return { customer: clone(c) };
    },
    async signOut() {
      (await cookies()).delete(COOKIE);
    },
    me: async () => clone(await current()),

    async saveProfile(p) {
      const c = await mustMe();
      Object.assign(c, p);
      save();
      return clone(c);
    },
    async saveAddress(a) {
      const c = await mustMe();
      const addr = { ...a, id: a.id || crypto.randomUUID() };
      const i = c.addresses.findIndex((x) => x.id === addr.id);
      if (i >= 0) c.addresses[i] = addr;
      else c.addresses.unshift(addr);
      save();
      return clone(addr);
    },
    async removeAddress(id) {
      const c = await mustMe();
      c.addresses = c.addresses.filter((x) => x.id !== id);
      save();
    },

    async favorites() {
      const c = await current();
      return c ? [...(S.favorites[c.id] ?? [])] : [];
    },
    async setFavorites(add, remove) {
      const c = await mustMe();
      const set = new Set(S.favorites[c.id] ?? []);
      add.forEach((x) => set.add(x));
      remove.forEach((x) => set.delete(x));
      S.favorites[c.id] = [...set];
      save();
      return [...set];
    },

    async coupons() {
      return S.coupons.map((coupon) => ({
        ...clone(coupon),
        used: S.orders.filter(
          (order) =>
            order.coupon?.id === coupon.id && order.status !== "cancelado",
        ).length,
      }));
    },
    async couponByCode(code) {
      const coupon = S.coupons.find((item) => item.code === code);
      return coupon
        ? {
            ...clone(coupon),
            used: S.orders.filter(
              (order) =>
                order.coupon?.id === coupon.id && order.status !== "cancelado",
            ).length,
          }
        : null;
    },
    async saveCoupon(id, draft) {
      if (
        S.coupons.some(
          (coupon) => coupon.code === draft.code && coupon.id !== id,
        )
      )
        throw new Error("Já existe um cupom com esse código.");
      const existing = id ? S.coupons.find((coupon) => coupon.id === id) : null;
      if (id && !existing) throw new Error("Cupom não encontrado.");
      if (
        existing &&
        existing.code !== draft.code &&
        S.orders.some((order) => order.coupon?.id === id)
      )
        throw new Error(
          "Cupons já utilizados mantêm seu código. Crie outro cupom.",
        );
      const coupon = {
        ...draft,
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        used: 0,
      };
      const index = S.coupons.findIndex((item) => item.id === coupon.id);
      if (index < 0) S.coupons.unshift(coupon);
      else S.coupons[index] = coupon;
      save();
      return clone(coupon);
    },
    async deleteCoupon(id) {
      if (S.orders.some((order) => order.coupon?.id === id))
        throw new Error(
          "Este cupom já foi utilizado. Desative-o para preservar o histórico.",
        );
      S.coupons = S.coupons.filter((coupon) => coupon.id !== id);
      save();
    },
    findCheckout: async (key, customerId) =>
      clone(
        S.orders.find(
          (order) =>
            order.checkoutKey === key && order.customerId === customerId,
        ) ?? null,
      ),
    async createCheckout(input, key, code) {
      // No await between validation and insertion: another request cannot spend
      // the final coupon use while this transaction is in progress.
      const existing = S.orders.find(
        (order) =>
          order.checkoutKey === key && order.customerId === input.customerId,
      );
      if (existing) return { order: clone(existing), created: false };
      const coupon = code ? S.coupons.find((item) => item.code === code) : null;
      if (code && !coupon) throw new Error("Cupom não encontrado.");
      const snapshot = coupon
        ? couponDiscount(
            {
              ...coupon,
              used: S.orders.filter(
                (order) =>
                  order.coupon?.id === coupon.id &&
                  order.status !== "cancelado",
              ).length,
            },
            input.subtotalCents,
          )
        : null;
      const discountCents = snapshot?.discountCents ?? 0;
      if ((input.discountCents ?? 0) !== discountCents)
        throw new Error("O cupom mudou. Confira o total e confirme novamente.");
      const order: Order = {
        ...clone(input),
        coupon: snapshot,
        discountCents,
        checkoutKey: key,
        totalCents: input.subtotalCents - discountCents + input.shippingCents,
        id: crypto.randomUUID(),
        number: ++S.seq,
        createdAt: new Date().toISOString(),
      };
      S.orders.unshift(order);
      save();
      return { order: clone(order), created: true };
    },
    async createOrder(o) {
      const order: Order = {
        ...clone(o),
        id: crypto.randomUUID(),
        number: ++S.seq,
        createdAt: new Date().toISOString(),
      };
      S.orders.unshift(order);
      save();
      return clone(order);
    },
    async myOrders() {
      const c = await current();
      return c
        ? S.orders.filter((o) => o.customerId === c.id).map(orderSummary)
        : [];
    },
    async myOrder(id) {
      const c = await current();
      const o = S.orders.find((x) => x.id === id);
      return c && o && o.customerId === c.id ? clone(o) : null;
    },

    getOrder: async (id) => clone(S.orders.find((x) => x.id === id) ?? null),
    async updateOrder(id, patch, event) {
      const o = S.orders.find((x) => x.id === id);
      if (!o) throw new Error("Pedido não encontrado.");
      Object.assign(o, patch);
      if (event) o.timeline.push(event);
      save();
      return clone(o);
    },
    allOrders: async () => S.orders.map(orderSummary),
    analyticsOrders: async () => clone(S.orders),
    customer: async (id) => clone(S.customers.find((customer) => customer.id === id) ?? null),
    customerOrders: async (id) => S.orders.filter((order) => order.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(orderSummary),
    async updateCustomer(id, contact) {
      const customer = S.customers.find((item) => item.id === id);
      if (!customer) throw new Error("Cliente não encontrado.");
      // Explicit fields preserve login identity, private profile fields and
      // immutable snapshots on earlier orders, including on legacy callers.
      customer.name = contact.name;
      customer.phone = contact.phone;
      customer.contactEmail = contact.contactEmail;
      save();
      return clone(customer);
    },
    async customers() {
      return S.customers.map((c) => {
        const mine = S.orders.filter(
          (o) =>
            o.customerId === c.id &&
            o.status !== "cancelado" &&
            o.status !== "aguardando_pagamento",
        );
        return {
          ...clone(c),
          orders: S.orders.filter((o) => o.customerId === c.id).length,
          spentCents: mine.reduce((s, o) => s + o.totalCents, 0),
        };
      });
    },
  };
}
