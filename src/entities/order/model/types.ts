import { z } from "zod";

/** Sacola, clientes e pedidos da loja. Valores em centavos. */

export const cartItemSchema = z.object({
  variantId: z.string(),
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  label: z.string().default(""),
  sku: z.string(),
  image: z.string().nullable().default(null),
  category: z.string().default("pendentes"),
  priceCents: z.number().int().nullable(),
  qty: z.number().int().min(1).max(99),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const addressSchema = z.object({
  id: z.string().default(""),
  recipient: z.string().trim().min(2, "Informe quem vai receber").max(120),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua").max(160),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80).default(""),
  district: z.string().trim().min(1, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  uf: z
    .string()
    .trim()
    .length(2, "UF com 2 letras")
    .transform((s) => s.toUpperCase()),
});
export type Address = z.infer<typeof addressSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  phone: z.string().trim().max(20).default(""),
  cpf: z.string().trim().max(14).default(""),
});
export type Profile = z.infer<typeof profileSchema>;

export type Customer = Profile & {
  id: string;
  email: string;
  contactEmail?: string;
  provider: "email" | "google";
  createdAt: string;
  addresses: Address[];
};
/** CRM fields only. The email used to authenticate is deliberately excluded. */
export type CustomerContactUpdate = {
  name: string;
  phone: string;
  contactEmail: string;
};

export const ORDER_STATUS = [
  "aguardando_pagamento",
  "pago",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pagamento aprovado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
/** Próximos passos possíveis no painel. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["em_separacao", "cancelado"],
  em_separacao: ["enviado", "cancelado"],
  enviado: ["entregue"],
  entregue: [],
  cancelado: [],
};

export type PaymentMethod = "pix" | "cartao";
export type Payment = {
  provider: string;
  method: PaymentMethod;
  status: "pendente" | "aprovado" | "recusado" | "estornado";
  chargeId: string;
  pixCode?: string;
  expiresAt?: string;
  brand?: string;
  last4?: string;
  installments?: number;
  paidAt?: string;
  message?: string;
};

export type OrderItem = Omit<CartItem, "qty" | "priceCents"> & {
  qty: number;
  priceCents: number;
};
export type ShippingChoice = {
  id: string;
  label: string;
  days: string;
  priceCents: number;
  pickupAddress?: string;
};

export type Order = {
  id: string;
  number: number;
  customerId: string;
  email: string;
  name: string;
  phone: string;
  items: OrderItem[];
  subtotalCents: number;
  /** Snapshot from the server; absent on orders created before coupons. */
  discountCents?: number;
  coupon?: {
    id: string;
    code: string;
    kind: "percentual" | "fixo";
    value: number;
    discountCents: number;
  } | null;
  checkoutKey?: string | null;
  shippingCents: number;
  totalCents: number;
  shipping: ShippingChoice & { address: Address | null };
  payment: Payment | null;
  status: OrderStatus;
  tracking: string;
  notes: string;
  timeline: Array<{
    status: OrderStatus | "criado" | "nota";
    at: string;
    note: string;
    by: string;
  }>;
  createdAt: string;
};

export type OrderSummary = Pick<
  Order,
  "id" | "number" | "name" | "email" | "totalCents" | "status" | "createdAt"
> & { items: number; method: PaymentMethod | null };

export const orderSummary = (o: Order): OrderSummary => ({
  id: o.id,
  number: o.number,
  name: o.name,
  email: o.email,
  totalCents: o.totalCents,
  status: o.status,
  createdAt: o.createdAt,
  items: o.items.reduce((s, i) => s + i.qty, 0),
  method: o.payment?.method ?? null,
});

export const cartCount = (items: Pick<CartItem, "qty">[]) =>
  items.reduce((s, i) => s + i.qty, 0);
export const cartSubtotal = (items: Pick<CartItem, "qty" | "priceCents">[]) =>
  items.reduce((s, i) => s + (i.priceCents ?? 0) * i.qty, 0);
export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export const formatCep = (s: string) =>
  onlyDigits(s)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");

/** Parcelamento no cartão (regra provisória, a confirmar com a loja): até 10x sem juros, parcela mínima de R$ 100. */
export const MAX_INSTALLMENTS = 10;
export const MIN_INSTALLMENT_CENTS = 10000;
export const installmentsFor = (totalCents: number) =>
  Math.max(
    1,
    Math.min(MAX_INSTALLMENTS, Math.floor(totalCents / MIN_INSTALLMENT_CENTS)),
  );
