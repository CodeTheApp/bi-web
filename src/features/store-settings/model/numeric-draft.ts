export const MAX_STORE_MONEY_CENTS = 1_000_000_000;
export type StoreNumericField =
  "preparationDays" | "pickupReadyDays" | "freeShippingFromCents";
export type StoreDraftValidity = Partial<Record<StoreNumericField, boolean>>;
export const storeDraftsValid = (fields: StoreDraftValidity) =>
  Object.values(fields).every(Boolean);

export function daysDraftValue(text: string): number | null {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}
export function validDaysDraft(text: string, min: number) {
  const value = daysDraftValue(text);
  return value !== null && value >= min && value <= 60;
}

export function moneyDraftCents(text: string): number | null {
  if (
    !/^\d+(?:\.\d{3})*(?:,\d{0,2})?$/.test(text) &&
    !/^\d+(?:\.\d{0,2})?$/.test(text)
  )
    return null;
  const value = Number(
    text.includes(",")
      ? text.replace(/\./g, "").replace(",", ".")
      : /^\d{1,3}(\.\d{3})+$/.test(text)
        ? text.replace(/\./g, "")
        : text,
  );
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
export function validMoneyDraft(text: string) {
  const value = moneyDraftCents(text);
  return value !== null && value >= 0 && value <= MAX_STORE_MONEY_CENTS;
}
