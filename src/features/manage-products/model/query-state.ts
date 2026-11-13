import { parseAsString, parseAsStringLiteral } from "nuqs/server";
import { CATEGORY_SLUGS } from "@/entities/product";
import { tableQueryParsers } from "@/shared/lib/url-state/table-parsers";

export const PRODUCT_STATUS_FILTERS = [
  "todos",
  "na-loja",
  "sem-estoque",
  "rascunho",
  "arquivado",
] as const;
export const PRODUCT_MEDIA_FILTERS = [
  "toda",
  "sem-foto",
  "com-video",
  "ocultas",
] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number];
export type ProductMediaFilter = (typeof PRODUCT_MEDIA_FILTERS)[number];
export const productListParsers = {
  q: parseAsString.withDefault(""),
  categoria: parseAsStringLiteral([
    "todas",
    ...CATEGORY_SLUGS,
  ] as const).withDefault("todas"),
  status: parseAsStringLiteral(PRODUCT_STATUS_FILTERS).withDefault("todos"),
  midia: parseAsStringLiteral(PRODUCT_MEDIA_FILTERS).withDefault("toda"),
  ...tableQueryParsers(["title", "category", "price", "stock", "status"]),
};
