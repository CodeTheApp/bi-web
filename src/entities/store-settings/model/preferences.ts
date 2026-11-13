import { z } from "zod";

export const storePreferencesSchema = z
  .object({
    deliveryEnabled: z.boolean().default(true),
    expressEnabled: z.boolean().default(true),
    pickupEnabled: z.boolean().default(true),
    pickupAddress: z.string().trim().max(240).default(""),
    pickupReadyDays: z.number().int().min(1).max(60).default(1),
    preparationDays: z.number().int().min(0).max(60).default(0),
    freeShippingFromCents: z
      .number()
      .int()
      .min(0)
      .max(1_000_000_000)
      .nullable()
      .default(300000),
    checkoutNotice: z.string().trim().max(500).default(""),
  })
  .superRefine((preferences, context) => {
    if (!preferences.deliveryEnabled && !preferences.pickupEnabled)
      context.addIssue({
        code: "custom",
        path: ["pickupEnabled"],
        message:
          "Mantenha entrega ou retirada disponível para receber pedidos.",
      });
  });
export type StorePreferences = z.infer<typeof storePreferencesSchema>;
export const DEFAULT_STORE_PREFERENCES: StorePreferences = Object.freeze(
  storePreferencesSchema.parse({}),
);

/** Legacy or malformed settings use the existing storefront defaults. */
export function normalizeStorePreferences(value?: unknown): StorePreferences {
  const parsed = storePreferencesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_STORE_PREFERENCES };
}
