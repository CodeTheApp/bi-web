import { z } from "zod";
import { createPersistedValue } from "@/shared/lib/persisted-value";
export const couponCodeStore = createPersistedValue({
  key: "bi:cupom",
  schema: z.string().trim().toUpperCase().max(40),
  fallback: "",
});
