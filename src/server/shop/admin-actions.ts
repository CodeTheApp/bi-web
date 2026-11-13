"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { NEXT_STATUS, ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from "@/entities/order";
import { ctx, run } from "@/server/admin/guard";
import { CATALOG_TAG } from "@/server/catalog/public";
import { getCatalogRepo } from "@/server/catalog/repo";
import { getShopRepo } from "./repo";
import { isDemoOrderFixture } from "./demo-fixtures";

/** Pedidos e clientes no painel (equipe logada). */

export async function getOrders() {
  return run(async () => {
    await ctx();
    return (await getShopRepo()).allOrders();
  });
}

export async function getOrderAdmin(id: string) {
  return run(async () => {
    await ctx();
    return (await getShopRepo()).getOrder(z.string().min(1).parse(id));
  });
}

export async function getCustomers() {
  return run(async () => {
    await ctx();
    return (await getShopRepo()).customers();
  });
}

/**
 * Avança o pedido. "Pagamento aprovado" baixa o estoque (Pix confirmado à mão, por exemplo);
 * cancelar um pedido já pago devolve o estoque e marca o pagamento como estornado.
 */
export async function setOrderStatus(id: string, status: OrderStatus, opts: { tracking?: string; note?: string } = {}) {
  return run(async () => {
    const { me, repo } = await ctx();
    const shop = await getShopRepo();
    const o = await shop.getOrder(z.string().min(1).parse(id));
    if (!o) throw new Error("Pedido não encontrado.");
    z.enum(ORDER_STATUS).parse(status);
    if (!NEXT_STATUS[o.status].includes(status)) throw new Error(`Um pedido "${ORDER_STATUS_LABEL[o.status]}" não pode ir para "${ORDER_STATUS_LABEL[status]}".`);
    const tracking = z.string().trim().max(80).optional().parse(opts.tracking);
    if (status === "enviado" && !tracking && !o.tracking && o.shipping.id !== "retirada") throw new Error("Informe o código de rastreio para marcar como enviado.");

    const paid = o.status !== "aguardando_pagamento";
    const affectsStock = !(shop.mode === "demo" && isDemoOrderFixture(o));
    if (affectsStock) {
      const catalog = await getCatalogRepo();
      if (status === "pago") await catalog.sell(o.items.map((i) => ({ variantId: i.variantId, qty: i.qty })), -1, `Pedido nº ${o.number}`);
      if (status === "cancelado" && paid) await catalog.sell(o.items.map((i) => ({ variantId: i.variantId, qty: i.qty })), 1, `Pedido nº ${o.number} cancelado`);
    }

    const payment =
      status === "pago" && o.payment ? { ...o.payment, status: "aprovado" as const, paidAt: new Date().toISOString() }
      : status === "cancelado" && paid && o.payment ? { ...o.payment, status: "estornado" as const }
      : undefined;
    const r = await shop.updateOrder(
      o.id,
      { status, ...(tracking !== undefined ? { tracking } : null), ...(payment ? { payment } : null) },
      { status, at: new Date().toISOString(), note: z.string().trim().max(300).default("").parse(opts.note ?? "") || (tracking ? `Rastreio ${tracking}` : ""), by: me.name },
    );
    await repo.log(`Pedido nº ${o.number}: ${ORDER_STATUS_LABEL[status].toLowerCase()}`);
    if (affectsStock && (status === "pago" || (status === "cancelado" && paid))) updateTag(CATALOG_TAG);
    return r;
  });
}

export async function addOrderNote(id: string, note: string) {
  return run(async () => {
    const { me } = await ctx();
    const shop = await getShopRepo();
    const text = z.string().trim().min(1, "Escreva a anotação.").max(500).parse(note);
    return shop.updateOrder(z.string().min(1).parse(id), {}, { status: "nota", at: new Date().toISOString(), note: text, by: me.name });
  });
}
