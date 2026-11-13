import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORE_PREFERENCES,
  normalizeStorePreferences,
  storePreferencesSchema,
} from "@/entities/store-settings";
import { pickupShippingChoice, quoteShipping } from "@/entities/order";

describe("store preference compatibility", () => {
  it("keeps all current shipping defaults when the optional settings are absent", () => {
    expect(normalizeStorePreferences()).toEqual(DEFAULT_STORE_PREFERENCES);
    expect(quoteShipping("70040-010", 50000, 1)).toEqual([
      {
        id: "retirada",
        label: "Retirar em Brasília",
        days: "Pronto em 1 dia útil",
        priceCents: 0,
      },
      {
        id: "padrao",
        label: "Entrega em Brasília",
        days: "1 a 2 dias úteis",
        priceCents: 0,
      },
      {
        id: "expressa",
        label: "Entrega expressa",
        days: "No próximo dia útil",
        priceCents: 5220,
      },
    ]);
    expect(quoteShipping("01310-100", 50000, 2)).toEqual(
      quoteShipping("01310-100", 50000, 2, DEFAULT_STORE_PREFERENCES),
    );
  });

  it("enforces enabled delivery methods and includes preparation in standard/express estimates", () => {
    const options = quoteShipping("70040-010", 50000, 1, {
      preparationDays: 2,
      pickupEnabled: false,
    });
    expect(options.map((choice) => choice.id)).toEqual(["padrao", "expressa"]);
    expect(options.map((choice) => choice.days)).toEqual([
      "3 a 4 dias úteis",
      "3 dias úteis",
    ]);
    expect(
      quoteShipping("70040-010", 50000, 1, { deliveryEnabled: false }).map(
        (choice) => choice.id,
      ),
    ).toEqual(["retirada"]);
    expect(
      quoteShipping("01310-100", 50000, 1, { expressEnabled: false }).map(
        (choice) => choice.id,
      ),
    ).toEqual(["padrao"]);
  });

  it("applies a configurable or disabled free-shipping threshold without making express shipping free", () => {
    expect(
      quoteShipping("01310-100", 80000, 1, {
        freeShippingFromCents: 80000,
      }).find((choice) => choice.id === "padrao")?.priceCents,
    ).toBe(0);
    expect(
      quoteShipping("01310-100", 79999, 1, {
        freeShippingFromCents: 80000,
      }).find((choice) => choice.id === "padrao")?.priceCents,
    ).toBe(7900);
    expect(
      quoteShipping("01310-100", 1000000, 1, {
        freeShippingFromCents: null,
      }).find((choice) => choice.id === "padrao")?.priceCents,
    ).toBe(7900);
    expect(
      quoteShipping("01310-100", 0, 1, { freeShippingFromCents: 0 }).find(
        (choice) => choice.id === "expressa",
      )!.priceCents,
    ).toBeGreaterThan(0);
    expect(
      quoteShipping("70040-010", 0, 1, { freeShippingFromCents: null }).find(
        (choice) => choice.id === "padrao",
      )?.priceCents,
    ).toBe(0);
  });

  it("creates a pickup snapshot and rejects an invalid no-fulfillment configuration", () => {
    expect(
      pickupShippingChoice({
        pickupAddress: "  Loja de teste, Brasília/DF  ",
        pickupReadyDays: 4,
      }),
    ).toEqual({
      id: "retirada",
      label: "Retirar em Brasília",
      priceCents: 0,
      days: "Pronto em 4 dias úteis",
      pickupAddress: "Loja de teste, Brasília/DF",
    });
    expect(pickupShippingChoice({ pickupEnabled: false })).toBeNull();
    expect(
      storePreferencesSchema.safeParse({
        deliveryEnabled: false,
        pickupEnabled: false,
      }).success,
    ).toBe(false);
    for (const data of [
      { preparationDays: -1 },
      { pickupReadyDays: 0 },
      { pickupReadyDays: 1.5 },
      { freeShippingFromCents: -1 },
      { freeShippingFromCents: 1.5 },
    ])
      expect(storePreferencesSchema.safeParse(data).success).toBe(false);
  });
});
