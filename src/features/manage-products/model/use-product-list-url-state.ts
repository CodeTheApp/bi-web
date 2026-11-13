"use client";
import { debounce, useQueryStates } from "nuqs";
import type {
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import type { CategorySlug } from "@/entities/product";
import {
  updatePagination,
  updateSorting,
} from "@/shared/lib/url-state/table-state";
import {
  productListParsers,
  type ProductMediaFilter,
  type ProductStatusFilter,
} from "./query-state";

export function useProductListUrlState() {
  const [state, set] = useQueryStates(productListParsers, {
    history: "replace",
    shallow: true,
    scroll: false,
  });
  return {
    search: state.q,
    cat: state.categoria,
    status: state.status,
    mediaF: state.midia,
    sorting: state.sort,
    pagination: { pageIndex: state.page - 1, pageSize: state.size },
    setSearch: (q: string) => {
      void set(
        { q, page: 1 },
        { limitUrlUpdates: q ? debounce(250) : undefined },
      );
    },
    setCat: (categoria: "todas" | CategorySlug) => {
      void set({ categoria, page: 1 });
    },
    setStatus: (status: ProductStatusFilter) => {
      void set({ status, page: 1 });
    },
    setMediaF: (midia: ProductMediaFilter) => {
      void set({ midia, page: 1 });
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
