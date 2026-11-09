import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { orderSummary, type Customer, type Order } from "@/lib/shop/types";
import { readDemo, writeDemoSoon } from "../demo-file";
import type { ShopRepo } from "./repo";

/**
 * Loja em modo demonstração: clientes, favoritos e pedidos em memória, gravados em data/demo-loja.json.
 * O login por código não manda e-mail: o código aparece na tela. O "Google" entra com o e-mail informado.
 */
type State = { secret: string; seq: number; customers: Customer[]; favorites: Record<string, string[]>; orders: Order[] };
const FILE = "demo-loja.json";
const COOKIE = "bi_cliente";
const g = globalThis as unknown as { __biShop?: State; __biCodes?: Map<string, { code: string; exp: number; tries: number }> };

function state(): State {
  if (g.__biShop) return g.__biShop;
  const saved = readDemo<State>(FILE);
  g.__biShop = { secret: saved?.secret ?? randomBytes(24).toString("hex"), seq: saved?.seq ?? 1000, customers: saved?.customers ?? [], favorites: saved?.favorites ?? {}, orders: saved?.orders ?? [] };
  return g.__biShop;
}
const save = () => writeDemoSoon(FILE, () => g.__biShop);
const codes = () => (g.__biCodes ??= new Map());

const sign = (id: string) => `${id}.${createHmac("sha256", state().secret).update(id).digest("base64url")}`;
function verify(token: string | undefined) {
  if (!token) return null;
  const id = token.slice(0, token.lastIndexOf("."));
  const a = Buffer.from(sign(id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

async function startSession(c: Customer) {
  (await cookies()).set(COOKIE, sign(c.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
}

function upsertCustomer(email: string, provider: Customer["provider"], name = "") {
  const S = state();
  const e = email.trim().toLowerCase();
  let c = S.customers.find((x) => x.email === e);
  if (!c) {
    c = { id: crypto.randomUUID(), email: e, name: name || "", phone: "", cpf: "", provider, createdAt: new Date().toISOString(), addresses: [] };
    S.customers.push(c);
  } else if (name && !c.name) c.name = name;
  save();
  return c;
}

const clone = <T,>(x: T): T => structuredClone(x);

export function demoShop(): ShopRepo {
  const S = state();
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
      codes().set(email.trim().toLowerCase(), { code, exp: Date.now() + 10 * 60_000, tries: 0 });
      return { demoCode: code };
    },
    async verifyCode(email, code) {
      const e = email.trim().toLowerCase();
      const hit = codes().get(e);
      if (!hit || hit.exp < Date.now()) throw new Error("O código expirou. Peça um novo.");
      if (++hit.tries > 5) throw new Error("Muitas tentativas. Peça um novo código.");
      if (hit.code !== code.trim()) throw new Error("Código incorreto. Confira e tente de novo.");
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

    async createOrder(o) {
      const order: Order = { ...clone(o), id: crypto.randomUUID(), number: ++S.seq, createdAt: new Date().toISOString() };
      S.orders.unshift(order);
      save();
      return clone(order);
    },
    async myOrders() {
      const c = await current();
      return c ? S.orders.filter((o) => o.customerId === c.id).map(orderSummary) : [];
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
    async customers() {
      return S.customers.map((c) => {
        const mine = S.orders.filter((o) => o.customerId === c.id && o.status !== "cancelado" && o.status !== "aguardando_pagamento");
        return { ...clone(c), orders: S.orders.filter((o) => o.customerId === c.id).length, spentCents: mine.reduce((s, o) => s + o.totalCents, 0) };
      });
    },
  };
}
