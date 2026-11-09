import "server-only";
import { randomBytes } from "node:crypto";
import type { Order, Payment, PaymentMethod } from "@/lib/shop/types";

/**
 * Pagamento atrás de uma interface própria: o checkout fala só com `PaymentProvider`.
 * Hoje há o provedor simulado (modo demonstração); o AbacatePay entra aqui sem mexer no checkout nem no painel.
 */
export type CardInput = { holder: string; last4: string; brand: string; installments: number };

export interface PaymentProvider {
  readonly id: string;
  readonly simulated: boolean;
  create(order: Order, method: PaymentMethod, card?: CardInput): Promise<Payment>;
}

const simulated: PaymentProvider = {
  id: "simulado",
  simulated: true,
  async create(order, method, card) {
    const chargeId = `sim_${randomBytes(8).toString("hex")}`;
    if (method === "pix") {
      // "copia e cola" fictício, no formato de um Pix, que nunca é aceito por um banco
      const pixCode = `00020126580014BR.GOV.BCB.PIX0136demo-brasilia-iluminacao-${order.number}52040000530398654${String(order.totalCents / 100).length.toString().padStart(2, "0")}${(order.totalCents / 100).toFixed(2)}5802BR5920BRASILIA ILUMINACAO6008BRASILIA62070503***6304${chargeId.slice(-4).toUpperCase()}`;
      return { provider: "simulado", method, status: "pendente", chargeId, pixCode, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() };
    }
    if (!card) throw new Error("Preencha os dados do cartão.");
    // cartão de teste terminado em 0002 é recusado, como nos ambientes de teste dos provedores
    if (card.last4 === "0002")
      return { provider: "simulado", method, status: "recusado", chargeId, brand: card.brand, last4: card.last4, installments: card.installments, message: "Pagamento recusado pelo emissor do cartão." };
    return { provider: "simulado", method, status: "aprovado", chargeId, brand: card.brand, last4: card.last4, installments: card.installments, paidAt: new Date().toISOString() };
  },
};

export function paymentProvider(): PaymentProvider {
  // if (process.env.ABACATEPAY_API_KEY) return abacatepay; — próxima fase
  return simulated;
}
