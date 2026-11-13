"use server";
import { z } from "zod";
import { couponDraftSchema } from "../model/coupon";
import { ctx, run } from "@/server/admin/guard";
import { getShopRepo } from "@/server/shop/repo";

export async function getCoupons() {
  return run(async () => {
    await ctx();
    return (await getShopRepo()).coupons();
  });
}
export async function saveCoupon(id: string | null, input: unknown) {
  return run(async () => {
    const { repo } = await ctx();
    const draft = couponDraftSchema.parse(input);
    const result = await (
      await getShopRepo()
    ).saveCoupon(id ? z.string().uuid().parse(id) : null, draft);
    await repo.log(`Cupom ${result.code}: ${id ? "atualizado" : "criado"}`);
    return result;
  });
}
export async function deleteCoupon(id: string) {
  return run(async () => {
    const { repo } = await ctx();
    await (await getShopRepo()).deleteCoupon(z.string().uuid().parse(id));
    await repo.log("Cupom removido");
  });
}
