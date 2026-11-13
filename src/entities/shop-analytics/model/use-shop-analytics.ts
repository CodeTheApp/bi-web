"use client";

import { useQuery } from "@tanstack/react-query";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { ORDER_STATUS } from "@/entities/order";
import { unwrap } from "@/shared/api/result";
import { getShopAnalytics } from "@/shared/api/admin-reads";
import { dateRange } from "./analytics";
import { financeSortParser, reportsSortParser } from "./query-state";
import { PERIODS } from "./types";

const parsers = {
  periodo: parseAsStringLiteral(PERIODS).withDefault("mes"),
  de: parseAsString.withDefault(""),
  ate: parseAsString.withDefault(""),
  pagamento: parseAsStringLiteral([
    "todos",
    "pix",
    "cartao",
    "manual",
  ] as const).withDefault("todos"),
  situacao: parseAsStringLiteral([
    "todos",
    ...ORDER_STATUS,
  ] as const).withDefault("todos"),
  movimento: parseAsStringLiteral([
    "todos",
    "recebido",
    "estorno",
    "aguardando",
  ] as const).withDefault("todos"),
  busca: parseAsString.withDefault(""),
  pagina: parseAsInteger.withDefault(1),
};

const financeParsers = { ...parsers, ordenar: financeSortParser };
const reportsParsers = { ...parsers, ordenar: reportsSortParser };

export function useShopAnalytics(mode: "finance" | "reports" = "reports") {
  const [filters, setFilters] = useQueryStates(
    mode === "finance" ? financeParsers : reportsParsers,
    { history: "replace", scroll: false },
  );
  const query = useQuery({
    queryKey: ["shop-analytics"],
    queryFn: ({ signal }) => unwrap(getShopAnalytics({ signal })),
    staleTime: 60_000,
  });
  const range = dateRange(filters.periodo, filters.de, filters.ate);
  const updateFilters = (patch: Partial<typeof filters>) =>
    setFilters({ ...patch, pagina: 1 });
  const reset = () =>
    setFilters({
      periodo: null,
      de: null,
      ate: null,
      pagamento: null,
      situacao: null,
      movimento: null,
      busca: null,
      pagina: null,
      ordenar: null,
    });
  return { query, filters, setFilters, updateFilters, range, reset };
}

export type AnalyticsControls = ReturnType<typeof useShopAnalytics>;
