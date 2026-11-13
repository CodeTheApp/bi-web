import { parseAsString, parseAsStringLiteral } from "nuqs/server";
export const INBOX_FILTERS = [
  "todas",
  "novo",
  "andamento",
  "respondido",
  "arquivado",
] as const;
export const inboxParsers = {
  q: parseAsString.withDefault(""),
  caixa: parseAsStringLiteral(INBOX_FILTERS).withDefault("todas"),
  t: parseAsString,
};
