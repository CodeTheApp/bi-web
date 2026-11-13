import { parseAsString } from "nuqs/server";
import { tableQueryParsers } from "@/shared/lib/url-state/table-parsers";

export const customerListParsers = {
  q: parseAsString.withDefault(""),
  cliente: parseAsString,
  ...tableQueryParsers([
    "name",
    "phone",
    "provider",
    "orders",
    "spentCents",
    "createdAt",
  ]),
};
