import type { ShippingChoice } from "@/entities/order/model/types";
import { onlyDigits } from "@/entities/order/model/types";
import {
  DEFAULT_STORE_PREFERENCES,
  normalizeStorePreferences,
  type StorePreferences,
} from "@/entities/store-settings";

/**
 * Frete simulado (modo demonstração): por faixa de CEP, a partir de Brasília.
 * Na fase de frete de verdade, esta função dá lugar à cotação da transportadora; a forma do resultado é a mesma.
 */
const REGIONS: Array<{
  from: number;
  to: number;
  name: string;
  base: number;
  days: [number, number];
}> = [
  { from: 70000, to: 72799, name: "DF", base: 0, days: [1, 2] },
  { from: 73000, to: 73699, name: "DF", base: 0, days: [1, 2] },
  {
    from: 72800,
    to: 76799,
    name: "Goiás e Tocantins",
    base: 4900,
    days: [3, 5],
  },
  { from: 1000, to: 39999, name: "Sudeste", base: 7900, days: [4, 7] },
  { from: 78000, to: 79999, name: "Centro-Oeste", base: 6900, days: [4, 6] },
  { from: 80000, to: 99999, name: "Sul", base: 8900, days: [5, 8] },
  { from: 40000, to: 65999, name: "Nordeste", base: 9900, days: [6, 10] },
  { from: 66000, to: 69999, name: "Norte", base: 12900, days: [8, 14] },
];

export function regionOf(cep: string) {
  const p = Number(onlyDigits(cep).slice(0, 5));
  return (
    REGIONS.find((r) => p >= r.from && p <= r.to) ?? REGIONS[REGIONS.length - 1]
  );
}

/** Expressa: um pouco mais rápida que a padrão; em Brasília, no dia útil seguinte. */
function expressDays([a, b]: [number, number], preparationDays = 0) {
  const from = Math.max(1, a - 1) + preparationDays;
  const to = Math.max(Math.max(1, a - 1), b - 2) + preparationDays;
  return from === to
    ? from === 1
      ? "No próximo dia útil"
      : `${from} dias úteis`
    : `${from} a ${to} dias úteis`;
}

/** Entrega grátis a partir deste valor, exceto na expressa. */
export const FREE_FROM = DEFAULT_STORE_PREFERENCES.freeShippingFromCents!;

export function pickupShippingChoice(
  input?: Partial<StorePreferences>,
): ShippingChoice | null {
  const preferences = normalizeStorePreferences(input);
  return preferences.pickupEnabled
    ? {
        id: "retirada",
        label: "Retirar em Brasília",
        days: `Pronto em ${preferences.pickupReadyDays} ${preferences.pickupReadyDays === 1 ? "dia útil" : "dias úteis"}`,
        priceCents: 0,
        ...(preferences.pickupAddress
          ? { pickupAddress: preferences.pickupAddress }
          : {}),
      }
    : null;
}

export function quoteShipping(
  cep: string,
  subtotalCents: number,
  units: number,
  input?: Partial<StorePreferences>,
): ShippingChoice[] {
  if (onlyDigits(cep).length !== 8) return [];
  const preferences = normalizeStorePreferences(input);
  const r = regionOf(cep);
  const extra = Math.max(0, units - 1) * 1500; // cada peça a mais pesa no frete
  const standard =
    r.base === 0 ||
    (preferences.freeShippingFromCents !== null &&
      subtotalCents >= preferences.freeShippingFromCents)
      ? 0
      : r.base + extra;
  const out: ShippingChoice[] = [];
  if (preferences.deliveryEnabled) {
    out.push({
      id: "padrao",
      label: r.name === "DF" ? "Entrega em Brasília" : "Entrega padrão",
      days: `${r.days[0] + preferences.preparationDays} a ${r.days[1] + preferences.preparationDays} dias úteis`,
      priceCents: standard,
    });
    if (preferences.expressEnabled)
      out.push({
        id: "expressa",
        label: "Entrega expressa",
        days: expressDays(r.days, preferences.preparationDays),
        priceCents: Math.round((r.base || 2900) * 1.8) + extra,
      });
  }
  const pickup = pickupShippingChoice(preferences);
  if ((r.name === "DF" || !preferences.deliveryEnabled) && pickup)
    out.unshift(pickup);
  return out;
}
