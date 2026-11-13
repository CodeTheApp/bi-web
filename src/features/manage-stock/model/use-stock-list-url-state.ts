"use client";
import { debounce, useQueryStates } from "nuqs";
import type {
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import {
  updatePagination,
  updateSorting,
} from "@/shared/lib/url-state/table-state";
import { stockListParsers, type STOCK_FILTERS } from "./query-state";
export function useStockListUrlState() {
  const [state, set] = useQueryStates(stockListParsers, {
    history: "replace",
    shallow: true,
    scroll: false,
  });
  return {
    filter: state.status,
    search: state.q,
    sorting: state.sort,
    pagination: { pageIndex: state.page - 1, pageSize: state.size },
    setFilter: (status: (typeof STOCK_FILTERS)[number]) => {
      void set({ status, page: 1 });
    },
    setSearch: (q: string) => {
      void set(
        { q, page: 1 },
        { limitUrlUpdates: q ? debounce(250) : undefined },
      );
    },
    setSorting: (updater: Updater<SortingState>) => {
      void set((current) => ({
        sort: updateSorting(updater, current.sort),
        page: 1,
      }));
    },
    setPagination: (updater: Updater<PaginationState>) => {
      void set((current) => updatePagination(updater, current));
    },
  };
}
