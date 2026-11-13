"use client";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";
import { useMemo, useState } from "react";
import { type ColumnDef, type OnChangeFn, type PaginationState, type SortingState, useTable } from "@tanstack/react-table";
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/shared/ui/reui/data-grid/data-grid-table";
import { GRID_PT } from "@/shared/lib/data-grid";

type Props<T extends { id: string }> = {
  rows: T[];
  columns: ColumnDef<DataGridFeatures, T>[];
  empty?: string;
  pageSize?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  showPagination?: boolean;
};

/** ReUI presentation with optional URL-controlled state; filtering still belongs to each feature. */
export function AdminDataTable<T extends { id: string }>({ rows, columns, empty = "Nenhum registro neste período.", pageSize = 10, pagination: controlledPagination, onPaginationChange, sorting: controlledSorting, onSortingChange, showPagination = true }: Props<T>) {
  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const [localPagination, setLocalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const sorting = controlledSorting ?? localSorting;
  const pagination = controlledPagination ?? { ...localPagination, pageIndex: Math.min(localPagination.pageIndex, Math.max(0, Math.ceil(rows.length / localPagination.pageSize) - 1)) };
  const headers = useMemo(() => withSortableHeaders(columns), [columns]);
  const changePagination: OnChangeFn<PaginationState> = onPaginationChange ?? setLocalPagination;
  const changeSorting: OnChangeFn<SortingState> = (updater) => {
    (onSortingChange ?? setLocalSorting)(updater);
    if (pagination.pageIndex) changePagination({ ...pagination, pageIndex: 0 });
  };
  const table = useTable({ features: dataGridFeatures, autoResetPageIndex: false, data: rows, columns: headers, getRowId: (row: T) => row.id, state: { sorting, pagination }, onSortingChange: changeSorting, onPaginationChange: changePagination });
  return <DataGrid table={table} recordCount={rows.length} i18n={GRID_PT} emptyMessage={empty} tableLayout={{ dense: true, headerBackground: false, rowBorder: true, width: "auto" }}><DataGridContainer border={false}><DataGridScrollArea><DataGridTable /></DataGridScrollArea></DataGridContainer>{showPagination && rows.length > pagination.pageSize && <div className="grid-foot"><DataGridPagination sizes={[10, 25, 50]} /></div>}</DataGrid>;
}
