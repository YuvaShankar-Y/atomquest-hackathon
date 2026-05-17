import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemRead, ItemStatus, PaginationMeta } from "@/types";

const statusClasses: Record<ItemStatus, string> = {
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  archived: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

interface ItemsTableProps {
  data: ItemRead[];
  meta?: PaginationMeta;
  isLoading: boolean;
  statusFilter: ItemStatus | "all";
  isDeletingId?: string | null;
  onPageChange: (page: number) => void;
  onStatusFilterChange: (status: ItemStatus | "all") => void;
  onAddItem: () => void;
  onEditItem: (item: ItemRead) => void;
  onDeleteItem: (item: ItemRead) => void;
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid grid-cols-4 gap-4 rounded-md border p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ItemsTable({
  data,
  meta,
  isLoading,
  statusFilter,
  isDeletingId,
  onPageChange,
  onStatusFilterChange,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: ItemsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [search, setSearch] = useState("");

  const filteredData = data.filter((item) => item.title.toLowerCase().includes(search.toLowerCase().trim()));

  const columns: Array<ColumnDef<ItemRead>> = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Title
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          {row.original.description ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClasses[row.original.status]}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Created At
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), "MMM d, yyyy p")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEditItem(row.original)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteItem(row.original)}
            disabled={isDeletingId === row.original.id}
          >
            <Trash2 className="h-4 w-4" />
            {isDeletingId === row.original.id ? "Deleting..." : "Delete"}
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Items</h2>
          <p className="text-sm text-muted-foreground">Manage your items with live backend pagination and mutations.</p>
        </div>
        <Button onClick={onAddItem}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by title..."
          className="sm:max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as ItemStatus | "all")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-medium text-muted-foreground">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No items match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Page {meta?.page ?? 1} of {meta?.total_pages ?? 1}
          {meta ? ` • ${meta.total} total items` : ""}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, (meta?.page ?? 1) - 1))}
            disabled={!meta || meta.page <= 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(meta?.total_pages ?? 1, (meta?.page ?? 1) + 1))}
            disabled={!meta || meta.page >= meta.total_pages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
