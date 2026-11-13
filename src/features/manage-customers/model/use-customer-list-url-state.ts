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
import { customerListParsers } from "./query-state";

export function useCustomerListUrlState() {
  const [state, set] = useQueryStates(customerListParsers, {
    history: "replace",
    shallow: true,
    scroll: false,
  });
  return {
    search: state.q,
    selectedCustomer: state.cliente,
    openCustomer: (cliente: string) => {
      void set({ cliente }, { history: "push" });
    },
    closeCustomer: () => {
      void set({ cliente: null });
    },
    sorting: state.sort,
    pagination: { pageIndex: state.page - 1, pageSize: state.size },
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
