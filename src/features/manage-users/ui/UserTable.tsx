"use client";

import { useMemo, useState } from "react";
import { debounce, useQueryStates } from "nuqs";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import type { AdminUser } from "@/entities/admin";
import { Chip, ControlTooltip } from "@/shared/ui/admin/ui";
import { Button } from "@/shared/ui/button";
import { Pencil } from "@/shared/ui/icons/lucide";
import { StaffAvatar } from "./StaffAvatar";
import { UserEditor } from "./UserEditor";
import { Icon } from "@/shared/ui/admin/icons";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/shared/ui/reui/data-grid/data-grid-column-header";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/shared/ui/reui/data-grid/data-grid-table";
import { GRID_PT } from "@/shared/lib/data-grid";
import {
  updatePagination,
  updateSorting,
} from "@/shared/lib/url-state/table-state";
import { userListParsers } from "../model/query-state";
import "./users.css";

/** Editing is guarded again on the server; invitation remains a separate flow. */
export function UserTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [state, set] = useQueryStates(userListParsers, {
    shallow: true,
    scroll: false,
    urlKeys: {
      q: "usuarios",
      page: "upagina",
      size: "utamanho",
      sort: "uordem",
    },
  });
  const rows = useMemo(() => {
    const term = state.q
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
    return users.filter(
      (user) =>
        !term ||
        `${user.name} ${user.email} ${user.role === "admin" ? "administrador" : "editor"} ${user.status}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("pt-BR")
          .includes(term),
    );
  }, [users, state.q]);
  const columns = useMemo<ColumnDef<DataGridFeatures, AdminUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Nome" />
        ),
        size: 230,
        cell: ({ row }) => (
          <div className="row settings-user-name">
            <StaffAvatar
              name={row.original.name}
              url={row.original.avatarUrl}
            />
            <div>
              <b>{row.original.name}</b>
              <small className="muted">{row.original.email}</small>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Papel" />
        ),
        size: 95,
        cell: ({ row }) => (
          <span className="staff-role">
            {row.original.role === "admin" ? "Admin" : "Editor"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Status" />
        ),
        size: 125,
        cell: ({ row }) => <Chip s={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Ações</span>,
        size: 44,
        enableSorting: false,
        cell: ({ row }) => (
          <ControlTooltip label={`Editar ${row.original.name}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar ${row.original.name}`}
              onClick={() => setEditing(row.original)}
            >
              <Pencil size={15} />
            </Button>
          </ControlTooltip>
        ),
      },
    ],
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    data: rows,
    columns,
    getRowId: (user: AdminUser) => user.id,
    autoResetPageIndex: false,
    state: {
      sorting: state.sort,
      pagination: { pageIndex: state.page - 1, pageSize: state.size },
    },
    onSortingChange: (updater) => {
      void set((current) => ({
        sort: updateSorting(updater, current.sort),
        page: 1,
      }));
    },
    onPaginationChange: (updater) => {
      void set((current) => updatePagination(updater, current));
    },
  });
  return (
    <>
      <div className="staff-users-grid">
        <div className="staff-users-toolbar">
          <label>
            <span className="sr-only">Buscar usuários por nome ou e-mail</span>
            <Icon name="search" />
            <input
              type="search"
              placeholder="Buscar usuários…"
              value={state.q}
              onChange={(event) => {
                void set(
                  { q: event.target.value, page: 1 },
                  {
                    limitUrlUpdates: event.target.value
                      ? debounce(250)
                      : undefined,
                  },
                );
              }}
            />
          </label>
          <small aria-live="polite">
            {rows.length} {rows.length === 1 ? "pessoa" : "pessoas"}
          </small>
        </div>
        <DataGrid
          table={table}
          recordCount={rows.length}
          i18n={GRID_PT}
          emptyMessage={
            users.length
              ? "Nenhum usuário corresponde à busca."
              : "Nenhum usuário cadastrado."
          }
          tableLayout={{
            dense: true,
            headerBackground: false,
            rowBorder: true,
            width: "auto",
          }}
        >
          <DataGridContainer border={false}>
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
          {(users.length > 5 || state.page > 1) && (
            <DataGridPagination
              sizes={[5, 10, 20]}
              className="staff-users-pagination"
            />
          )}
        </DataGrid>
      </div>
      {editing && (
        <UserEditor
          open
          onClose={() => setEditing(null)}
          user={editing}
          mode="admin"
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
