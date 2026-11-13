import { z } from "zod";
import { createPersistedValue } from "@/shared/lib/persisted-value";

/** Addresses, document numbers and payment data stay out of storage. */
export const createPostalCodeStore = (storage?: () => Storage) =>
  createPersistedValue({
    key: "bi:cep",
    schema: z.union([z.literal(""), z.string().regex(/^\d{8}$/)]),
    fallback: "",
    storage,
  });
export const postalCodeStore = createPostalCodeStore();
