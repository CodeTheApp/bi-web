import { parseAsString, parseAsStringLiteral } from "nuqs/server";
import { tableQueryParsers } from "@/shared/lib/url-state/table-parsers";
export const STOCK_FILTERS = ["saldo", "todas"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];
export const stockListParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(STOCK_FILTERS).withDefault("saldo"),
  ...tableQueryParsers(["product", "sku", "stock"]),
};
