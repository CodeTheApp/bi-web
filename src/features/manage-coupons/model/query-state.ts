import { parseAsString, parseAsStringLiteral } from "nuqs/server";
import { tableQueryParsers } from "@/shared/lib/url-state/table-parsers";
export const couponListParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral([
    "todos",
    "ativos",
    "inativos",
  ] as const).withDefault("todos"),
  ...tableQueryParsers(["code", "value", "used", "createdAt"]),
};
