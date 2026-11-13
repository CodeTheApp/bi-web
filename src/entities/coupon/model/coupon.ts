import { z } from "zod";

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Use pelo menos 2 caracteres.")
  .max(40)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Use letras, números, hífen ou sublinhado.");
const date = z.string().datetime({ offset: true }).nullable();
export const couponDraftSchema = z
  .object({
    code: couponCodeSchema,
    kind: z.enum(["percentual", "fixo"]),
    value: z.number().int().min(1, "Informe o desconto.").max(100000000),
    minimumCents: z.number().int().min(0).max(100000000).default(0),
    startsAt: date.default(null),
    expiresAt: date.default(null),
    active: z.boolean().default(false),
    maxUses: z.number().int().min(1).max(10000000).nullable().default(null),
  })
  .superRefine((coupon, ctx) => {
    if (coupon.kind === "percentual" && coupon.value > 100)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "O percentual máximo é 100%.",
      });
    if (
      coupon.startsAt &&
      coupon.expiresAt &&
      Date.parse(coupon.expiresAt) <= Date.parse(coupon.startsAt)
    )
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "O fim deve ser depois do início.",
      });
  });
export type CouponDraft = z.infer<typeof couponDraftSchema>;
export type Coupon = CouponDraft & {
  id: string;
  used: number;
  createdAt: string;
};
export type CouponSnapshot = {
  id: string;
  code: string;
  kind: CouponDraft["kind"];
  value: number;
  discountCents: number;
};

/** Products only: shipping is never reduced, and cents never use floating point prices. */
export function couponDiscount(
  coupon: Coupon,
  subtotal: number,
  now = Date.now(),
): CouponSnapshot {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0)
    throw new Error("Subtotal inválido.");
  if (!coupon.active) throw new Error("Este cupom está desativado.");
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now)
    throw new Error("Este cupom ainda não começou.");
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= now)
    throw new Error("Este cupom expirou.");
  if (subtotal < coupon.minimumCents)
    throw new Error(
      `Este cupom exige pelo menos ${(coupon.minimumCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em produtos.`,
    );
  if (coupon.maxUses !== null && coupon.used >= coupon.maxUses)
    throw new Error("Este cupom atingiu o limite de usos.");
  const discountCents = Math.min(
    subtotal,
    coupon.kind === "percentual"
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value,
  );
  if (!discountCents) throw new Error("Adicione produtos para usar o cupom.");
  return {
    id: coupon.id,
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    discountCents,
  };
}
