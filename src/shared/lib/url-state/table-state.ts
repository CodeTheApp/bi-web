import type {
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";

export function updatePagination(
  updater: Updater<PaginationState>,
  current: { page: number; size: number },
) {
  const previous = { pageIndex: current.page - 1, pageSize: current.size };
  const next = typeof updater === "function" ? updater(previous) : updater;
  return { page: next.pageIndex + 1, size: next.pageSize };
}

export function updateSorting(
  updater: Updater<SortingState>,
  current: SortingState,
) {
  return typeof updater === "function" ? updater(current) : updater;
}
