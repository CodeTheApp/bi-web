import { parseAsString, parseAsStringLiteral } from "nuqs/server";
import { tableQueryParsers } from "@/shared/lib/url-state/table-parsers";

export const ORDER_FILTERS = ["abertos", "pagar", "enviar", "todos"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];
export const orderListParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(ORDER_FILTERS).withDefault("abertos"),
  ...tableQueryParsers([
    "number",
    "name",
    "items",
    "method",
    "totalCents",
    "status",
  ]),
};
