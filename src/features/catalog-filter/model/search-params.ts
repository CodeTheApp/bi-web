import {
  createLoader,
  createParser,
  createSerializer,
  parseAsNativeArrayOf,
} from "nuqs/server";
import { CATEGORIES } from "@/entities/product";
import { FINISH_FAMILIES } from "@/entities/product";
import { PRICES, SORTS } from "@/entities/product";

const choice = (allowed: readonly string[]) =>
  createParser({
    parse: (value) => (allowed.includes(value) ? value : null),
    serialize: (value: string) => value,
  });
const flag = createParser({
  parse: (value) => value === "1",
  serialize: (value: boolean) => (value ? "1" : "0"),
}).withDefault(false);

/** The same parameter names and repeated `cor` keys used by the server catalogue and existing links. */
export const catalogSearchParams = {
  categoria: choice(CATEGORIES.map((category) => category.slug)).withDefault(
    "",
  ),
  q: createParser({
    parse: (value) => value.slice(0, 80),
    serialize: (value: string) => value.slice(0, 80),
  }).withDefault(""),
  ordem: choice(SORTS.map((sort) => sort.id)).withDefault(""),
  pagina: createParser({
    parse: (value) => Math.max(1, Number.parseInt(value, 10) || 1),
    serialize: (value: number) => String(Math.max(1, value)),
  }).withDefault(1),
  cor: parseAsNativeArrayOf(
    choice(FINISH_FAMILIES.map((finish) => finish.id)),
  ).withDefault([]),
  preco: choice(PRICES.map((price) => price.id)).withDefault(""),
  pronta: flag,
  video: flag,
};

export const loadCatalogSearch = createLoader(catalogSearchParams);
export const serializeCatalogSearch = createSerializer(catalogSearchParams);
export const catalogStateFromHref = (href: string) =>
  loadCatalogSearch(new URL(href, "https://loja.local"));
