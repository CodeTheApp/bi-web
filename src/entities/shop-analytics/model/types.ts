import type { OrderStatus, PaymentMethod } from "@/entities/order";

export type AnalyticsOrder = {
  id: string;
  number: number;
  customerName: string;
  createdAt: string;
  status: OrderStatus;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  method: PaymentMethod | null;
  paymentStatus: "pendente" | "aprovado" | "recusado" | "estornado" | null;
  paidAt: string | null;
  refundedAt: string | null;
  wasPaid: boolean;
  items: Array<{ productId: string; title: string; category: string; sku: string; qty: number; priceCents: number }>;
};

export const PERIODS = ["mes", "7d", "30d", "90d", "ano", "tudo", "personalizado"] as const;
export type AnalyticsPeriod = (typeof PERIODS)[number];
export type DateRange = { from: string | null; to: string | null; error?: string };
export type MethodFilter = "todos" | "pix" | "cartao" | "manual";
export type MovementKind = "recebido" | "estorno" | "aguardando";
export type Movement = { id: string; orderId: string; number: number; customerName: string; kind: MovementKind; amountCents: number; method: PaymentMethod | null; at: string | null };
export type SeriesPoint = { day: string; receivedCents: number; refundedCents: number; orders: number };
