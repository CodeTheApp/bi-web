import type { ColumnDef } from "@tanstack/react-table";
import type { DataGridFeatures } from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/shared/ui/reui/data-grid/data-grid-column-header";

/** Show ReUI's sorting/column controls for data columns, preserving bespoke action headers. */
export function withSortableHeaders<T extends object>(columns: ColumnDef<DataGridFeatures, T>[]): ColumnDef<DataGridFeatures, T>[] {
  return columns.map((definition): ColumnDef<DataGridFeatures, T> => {
    if (typeof definition.header !== "string" || !definition.header || definition.enableSorting === false || !("accessorKey" in definition || "accessorFn" in definition)) return definition;
    const title = definition.header;
    return { ...definition, id: definition.id ?? ("accessorKey" in definition ? String(definition.accessorKey) : title), meta: { ...definition.meta, headerTitle: title }, header: ({ column }) => <DataGridColumnHeader column={column} title={title} /> };
  });
}
