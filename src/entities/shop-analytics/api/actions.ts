"use server";

import { ctx, run } from "@/server/admin/guard";
import { getShopRepo } from "@/server/shop/repo";
import { analyticsOrder } from "../model/analytics";

/** Staff-only snapshots; private addresses, contact details and payment credentials never leave the server. */
export async function getShopAnalytics() {
  return run(async () => {
    await ctx();
    const orders = await (await getShopRepo()).analyticsOrders();
    return { orders: orders.map(analyticsOrder), generatedAt: new Date().toISOString() };
  });
}
