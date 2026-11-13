import { createSortingParser } from "@/shared/lib/url-state/table-parsers";

export const financeSortParser = createSortingParser(["number", "customerName", "kind", "at", "method", "amountCents"]).withDefault([]);
export const reportsSortParser = createSortingParser(["number", "customerName", "createdAt", "status", "method", "totalCents"]).withDefault([]);
