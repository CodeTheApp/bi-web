"use server";
import {
  couponCodeSchema,
  couponDiscount,
  type CouponSnapshot,
} from "@/entities/coupon";
import { installmentsFor } from "@/entities/order";
import { updateTag } from "next/cache";
import { z } from "zod";
import { canSell, variantLabel } from "@/entities/product";
import { quoteShipping, pickupShippingChoice } from "@/entities/order";
import {
  addressSchema,
  profileSchema,
  type Address,
  type Order,
  type OrderItem,
  type PaymentMethod,
} from "@/entities/order";
import { run } from "@/server/admin/guard";
import { getCatalog, CATALOG_TAG } from "@/server/catalog/public";
import { getCatalogRepo } from "@/server/catalog/repo";
import { paymentProvider } from "./payments";
import { getShopRepo } from "./repo";
import { isDemoOrderFixture } from "./demo-fixtures";
import { getStorePreferences } from "./store-preferences";

/** Ações da loja (lado do cliente). Devolvem Result, como as do painel. */

const email = z.string().trim().toLowerCase().email("Confira o e-mail.");
const ids = z.array(z.string().min(1)).max(500);

export async function shopSession() {
  return run(async () => {
    const shop = await getShopRepo();
    const [customer, favorites] = await Promise.all([
      shop.me(),
      shop.favorites(),
    ]);
    return { customer, favorites, demo: shop.mode === "demo" };
  });
}

/* ---------------- entrar ---------------- */
export async function requestCode(input: string) {
  return run(async () => {
    const shop = await getShopRepo();
    const r = await shop.sendCode(email.parse(input));
    return { demoCode: r.demoCode ?? null };
  });
}

/** Confere o código e junta os favoritos que a pessoa marcou antes de entrar. */
export async function confirmCode(
  input: string,
  code: string,
  localFavorites: string[] = [],
) {
  return run(async () => {
    const shop = await getShopRepo();
    const c = await shop.verifyCode(
      email.parse(input),
      z
        .string()
        .regex(/^\d{6}$/, "O código tem 6 números.")
        .parse(code.trim()),
    );
    const favorites = await shop.setFavorites(ids.parse(localFavorites), []);
    return { customer: c, favorites };
  });
}

export async function googleSignIn(
  next: string,
  demoEmail?: string,
  demoName?: string,
  localFavorites: string[] = [],
) {
  return run(async () => {
    const shop = await getShopRepo();
    const r = await shop.google(
      next.startsWith("/") ? next : "/conta",
      demoEmail ? email.parse(demoEmail) : undefined,
      demoName?.trim().slice(0, 120),
    );
    if (r.url) return { url: r.url, customer: null, favorites: [] as string[] };
    const favorites = await shop.setFavorites(ids.parse(localFavorites), []);
    return { url: null, customer: r.customer ?? null, favorites };
  });
}

export async function signOutCustomer() {
  return run(async () => (await getShopRepo()).signOut());
}

/* ---------------- conta ---------------- */
export async function saveProfile(input: unknown) {
  return run(async () =>
    (await getShopRepo()).saveProfile(profileSchema.parse(input)),
  );
}
export async function saveAddress(input: unknown) {
  return run(async () =>
    (await getShopRepo()).saveAddress(addressSchema.parse(input)),
  );
}
export async function removeAddress(id: string) {
  return run(async () =>
    (await getShopRepo()).removeAddress(z.string().min(1).parse(id)),
  );
}

/* ---------------- favoritos ---------------- */
export async function setFavorite(productId: string, on: boolean) {
  return run(async () => {
    const shop = await getShopRepo();
    const id = z.string().min(1).parse(productId);
    return shop.setFavorites(on ? [id] : [], on ? [] : [id]);
  });
}

/** Produtos favoritos para a página de favoritos (também funciona sem login, com a lista do navegador). */
export async function favoriteProducts(list: string[]) {
  return run(async () => {
    const want = new Set(ids.parse(list));
    return (await getCatalog()).filter((p) => want.has(p.id));
  });
}

/* ---------------- sacola ---------------- */
type Line = { variantId: string; qty: number };
const lines = z
  .array(
    z.object({
      variantId: z.string().min(1),
      qty: z.number().int().min(1).max(99),
    }),
  )
  .max(60);

/**
 * Confere a sacola com o catálogo de agora: preço atual, se ainda está à venda e quanto dá para levar.
 * A sacola mora no navegador; quem decide preço e disponibilidade é sempre o servidor.
 */
async function quote(input: Line[]) {
  const catalog = await getCatalog();
  const out = lines.parse(input).map((l) => {
    for (const p of catalog) {
      const v = p.variants.find((x) => x.id === l.variantId);
      if (!v) continue;
      const sellable = canSell(v);
      // pronta entrega sem saldo exato no site: limita a 1 por variante só quando esgotada; o servidor baixa o estoque no pagamento
      const max = !sellable ? 0 : 99;
      return {
        variantId: v.id,
        productId: p.id,
        slug: p.slug,
        title: p.title,
        label: variantLabel(v, p.options),
        sku: v.sku,
        category: p.category,
        image:
          (
            p.media.find((m) => m.variantId === v.id && m.kind === "imagem") ??
            p.media.find((m) => m.kind === "imagem")
          )?.url ?? null,
        priceCents: v.priceCents,
        qty: Math.min(l.qty, Math.max(max, 0)),
        available: sellable && v.priceCents != null && v.priceCents > 0,
        reason: !sellable
          ? "Esgotado"
          : v.priceCents == null || v.priceCents <= 0
            ? "Preço sob consulta"
            : "",
        inStock: v.inStock,
        leadTimeDays: v.leadTimeDays,
        stockPolicy: v.stockPolicy,
      };
    }
    return {
      variantId: l.variantId,
      productId: "",
      slug: "",
      title: "Peça indisponível",
      label: "",
      sku: "",
      category: "pendentes",
      image: null,
      priceCents: null,
      qty: 0,
      available: false,
      reason: "Não está mais na loja",
      inStock: false,
      leadTimeDays: null,
      stockPolicy: "estoque" as const,
    };
  });
  const ok = out.filter((l) => l.available);
  const subtotal = ok.reduce((s, l) => s + (l.priceCents ?? 0) * l.qty, 0);
  return { lines: out, subtotal, units: ok.reduce((s, l) => s + l.qty, 0) };
}

async function discountFor(
  code: string,
  subtotal: number,
): Promise<CouponSnapshot | null> {
  if (!code.trim()) return null;
  const normalized = couponCodeSchema.parse(code);
  const coupon = await (await getShopRepo()).couponByCode(normalized);
  if (!coupon) throw new Error("Cupom não encontrado.");
  return couponDiscount(coupon, subtotal);
}

export async function quoteCart(input: Line[], couponCode = "") {
  return run(async () => {
    const q = await quote(input);
    let coupon: CouponSnapshot | null = null;
    let couponError: string | null = null;
    try {
      coupon = await discountFor(couponCode, q.subtotal);
    } catch (error) {
      couponError =
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Confira o código do cupom.")
          : error instanceof Error
            ? error.message
            : "Não foi possível validar o cupom.";
    }
    return {
      ...q,
      coupon,
      couponError,
      discountCents: coupon?.discountCents ?? 0,
    };
  });
}

export async function shippingOptions(
  cep: string,
  input: Line[],
  couponCode = "",
) {
  return run(async () => {
    const [q, preferences] = await Promise.all([
      quote(input),
      getStorePreferences(),
    ]);
    const coupon = await discountFor(couponCode, q.subtotal);
    return quoteShipping(
      cep,
      q.subtotal - (coupon?.discountCents ?? 0),
      q.units,
      preferences,
    );
  });
}

/* ---------------- pedido e pagamento ---------------- */
const cardSchema = z.object({
  holder: z.string().trim().min(3, "Nome como está no cartão").max(80),
  last4: z.string().regex(/^\d{4}$/),
  brand: z.string().max(20),
  installments: z.number().int().min(1).max(10),
});
const placeSchema = z.object({
  items: lines.min(1, "Sua sacola está vazia."),
  checkoutKey: z.string().uuid(),
  couponCode: z.string().max(40).default(""),
  expectedTotalCents: z.number().int().min(0),
  address: addressSchema.nullable(),
  shippingId: z.string().min(1, "Escolha a entrega."),
  method: z.enum(["pix", "cartao"]),
  card: cardSchema.optional(),
  notes: z.string().max(500).default(""),
});

/** Aprovação: baixa o estoque, registra no histórico e atualiza a loja (o produto pode sair, se esgotar). */
async function markPaid(orderId: string, by: string) {
  const shop = await getShopRepo();
  const o = await shop.getOrder(orderId);
  if (!o || o.status !== "aguardando_pagamento") return o;
  const affectsStock = !(shop.mode === "demo" && isDemoOrderFixture(o));
  if (affectsStock) {
    const catalog = await getCatalogRepo();
    await catalog.sell(
      o.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      -1,
      `Pedido nº ${o.number}`,
    );
  }
  const paid = await shop.updateOrder(
    o.id,
    {
      status: "pago",
      payment: o.payment
        ? { ...o.payment, status: "aprovado", paidAt: new Date().toISOString() }
        : null,
    },
    {
      status: "pago",
      at: new Date().toISOString(),
      note: o.payment?.method === "pix" ? "Pix confirmado" : "Cartão aprovado",
      by,
    },
  );
  if (affectsStock) updateTag(CATALOG_TAG);
  return paid;
}

async function charge(
  order: Order,
  method: PaymentMethod,
  card?: z.infer<typeof cardSchema>,
) {
  const shop = await getShopRepo();
  const payment = await paymentProvider().create(order, method, card);
  let o = await shop.updateOrder(
    order.id,
    { payment },
    payment.status === "recusado"
      ? {
          status: "nota",
          at: new Date().toISOString(),
          note: payment.message ?? "Pagamento recusado",
          by: "Pagamento",
        }
      : undefined,
  );
  if (payment.status === "aprovado")
    o = (await markPaid(o.id, "Pagamento")) ?? o;
  return o;
}

export async function placeOrder(input: unknown) {
  return run(async () => {
    const shop = await getShopRepo();
    const me = await shop.me();
    if (!me) throw new Error("Entre na sua conta para finalizar.");
    if (!me.name) throw new Error("Informe seu nome para finalizar.");
    const data = placeSchema.parse(input);

    const existing = await shop.findCheckout(data.checkoutKey, me.id);
    if (existing)
      return {
        id: existing.id,
        number: existing.number,
        status: existing.status,
        payment: existing.payment,
      };
    const [q, preferences] = await Promise.all([
      quote(data.items),
      getStorePreferences(),
    ]);
    const coupon = await discountFor(data.couponCode, q.subtotal);
    const discountCents = coupon?.discountCents ?? 0;
    const netSubtotal = q.subtotal - discountCents;
    const bad = q.lines.find((l) => !l.available);
    if (bad)
      throw new Error(
        `${bad.title}${bad.label ? ` (${bad.label})` : ""}: ${bad.reason.toLowerCase()}. Tire da sacola para continuar.`,
      );
    const options =
      data.shippingId === "retirada" && !data.address
        ? [pickupShippingChoice(preferences)].filter(
            (choice): choice is NonNullable<typeof choice> => choice !== null,
          )
        : quoteShipping(
            data.address?.cep ?? "",
            netSubtotal,
            q.units,
            preferences,
          );
    const ship = options.find((s) => s.id === data.shippingId);
    if (!ship)
      throw new Error("Escolha uma forma de entrega válida para o CEP.");
    if (ship.id !== "retirada" && !data.address)
      throw new Error("Informe o endereço de entrega.");

    const totalCents = netSubtotal + ship.priceCents;
    if (data.expectedTotalCents !== totalCents)
      throw new Error(
        "O total mudou. Confira o resumo atualizado e confirme novamente.",
      );
    if (data.method === "cartao" && totalCents > 0 && !data.card)
      throw new Error("Preencha os dados do cartão.");
    if (data.card && data.card.installments > installmentsFor(totalCents))
      throw new Error("Confira o parcelamento para o novo total.");
    const items: OrderItem[] = q.lines.map((l) => ({
      variantId: l.variantId,
      productId: l.productId,
      slug: l.slug,
      title: l.title,
      label: l.label,
      sku: l.sku,
      image: l.image,
      category: l.category,
      priceCents: l.priceCents!,
      qty: l.qty,
    }));
    const now = new Date().toISOString();
    const units = items.reduce((s, i) => s + i.qty, 0);
    const created = await shop.createCheckout(
      {
        customerId: me.id,
        email: me.email,
        name: me.name,
        phone: me.phone,
        items,
        subtotalCents: q.subtotal,
        shippingCents: ship.priceCents,
        totalCents,
        discountCents,
        coupon,
        shipping: {
          ...ship,
          address: ship.id === "retirada" ? null : (data.address as Address),
        },
        payment: null,
        status: "aguardando_pagamento",
        tracking: "",
        notes: data.notes,
        timeline: [
          {
            status: "criado",
            at: now,
            note: `${units} ${units === 1 ? "peça" : "peças"} · ${ship.label}`,
            by: me.name,
          },
        ],
      },
      data.checkoutKey,
      coupon?.code ?? "",
    );
    const order = created.order;
    if (!created.created)
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        payment: order.payment,
      };
    // guarda o endereço novo na conta, para a próxima compra
    if (data.address && !data.address.id)
      await shop.saveAddress(data.address).catch(() => null);
    // Fully discounted products with free delivery create a real, zero-value
    // order without asking a payment gateway to charge zero.
    let o: Order;
    if (!order.totalCents) {
      await shop.updateOrder(order.id, {
        payment: {
          provider: "cupom",
          method: data.method,
          status: "aprovado",
          chargeId: `coupon_${order.id}`,
          paidAt: now,
        },
      });
      o = (await markPaid(order.id, "Cupom")) ?? order;
    } else o = await charge(order, data.method, data.card);
    return { id: o.id, number: o.number, status: o.status, payment: o.payment };
  });
}

/** Tentar de novo (cartão recusado, Pix expirado ou troca de forma de pagamento). */
export async function retryPayment(
  orderId: string,
  method: PaymentMethod,
  card?: unknown,
) {
  return run(async () => {
    const shop = await getShopRepo();
    const o = await shop.myOrder(z.string().min(1).parse(orderId));
    if (!o) throw new Error("Pedido não encontrado.");
    if (o.status !== "aguardando_pagamento")
      throw new Error("Este pedido já foi pago ou cancelado.");
    const r = await charge(
      o,
      z.enum(["pix", "cartao"]).parse(method),
      card ? cardSchema.parse(card) : undefined,
    );
    return { id: r.id, number: r.number, status: r.status, payment: r.payment };
  });
}

/** Só no modo demonstração: faz de conta que o banco confirmou o Pix. */
export async function simulatePixPaid(orderId: string) {
  return run(async () => {
    if (!paymentProvider().simulated)
      throw new Error("Disponível só no modo demonstração.");
    const shop = await getShopRepo();
    const o = await shop.myOrder(z.string().min(1).parse(orderId));
    if (!o) throw new Error("Pedido não encontrado.");
    const r = await markPaid(o.id, "Pagamento");
    return { id: o.id, status: r?.status ?? o.status };
  });
}

export async function myOrders() {
  return run(async () => (await getShopRepo()).myOrders());
}

export async function myOrder(orderId: string) {
  return run(async () =>
    (await getShopRepo()).myOrder(z.string().min(1).parse(orderId)),
  );
}
