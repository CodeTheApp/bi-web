import "server-only";
import { getContent } from "@/server/content";
import { normalizeStorePreferences } from "@/entities/store-settings";

/** Only persisted settings decide fulfillment availability and the free-shipping threshold. */
export async function getStorePreferences() {
  const { settings } = await getContent();
  return normalizeStorePreferences((settings as { store?: unknown }).store);
}
