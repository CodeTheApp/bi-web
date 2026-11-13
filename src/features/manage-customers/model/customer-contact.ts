import { z } from "zod";
import type { Customer, OrderSummary } from "@/entities/order";

export const customerIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/, "Cliente inválido.");
export const customerContactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe um nome com pelo menos 2 caracteres.")
      .max(120),
    contactEmail: z
      .string()
      .trim()
      .max(254)
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        "Confira o e-mail de contato.",
      )
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine(
        (value) =>
          !value ||
          (/^[+\d()\s.-]+$/.test(value) &&
            /^\d{10,15}$/.test(value.replace(/\D/g, ""))),
        "Informe um telefone com DDD, ou deixe vazio.",
      ),
  })
  .strict();
export type CustomerContact = z.infer<typeof customerContactSchema>;
export type CustomerRecord = Pick<
  Customer,
  "id" | "name" | "email" | "phone" | "provider" | "createdAt"
> & { contactEmail: string };
export const customerRecord = (customer: Customer): CustomerRecord => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  contactEmail: customer.contactEmail ?? "",
  phone: customer.phone,
  provider: customer.provider,
  createdAt: customer.createdAt,
});

export function customerMetrics(orders: readonly OrderSummary[]) {
  const paid = orders.filter(
    (order) =>
      order.status !== "cancelado" && order.status !== "aguardando_pagamento",
  );
  const totalCents = paid.reduce((sum, order) => sum + order.totalCents, 0);
  const lastOrder =
    [...orders].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )[0] ?? null;
  return {
    count: orders.length,
    paidCount: paid.length,
    totalCents,
    averageCents: paid.length ? Math.round(totalCents / paid.length) : 0,
    lastOrder,
  };
}

export function customerWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  const national =
    !phone.trim().startsWith("+") &&
    (digits.length === 10 || digits.length === 11);
  return `https://wa.me/${national ? `55${digits}` : digits}`;
}
