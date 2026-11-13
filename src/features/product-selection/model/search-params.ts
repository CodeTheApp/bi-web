import { createParser, parseAsString } from "nuqs/server";

export const productSearchParams = {
  variante: parseAsString.withDefault(""),
  foto: createParser({
    parse: (value) => Math.max(1, Number.parseInt(value, 10) || 1),
    serialize: (value: number) => String(Math.max(1, value)),
  }).withDefault(1),
};
