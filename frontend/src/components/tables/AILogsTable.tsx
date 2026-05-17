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
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AILogRead, AIProviderName, PaginationMeta } from "@/types";

interface AILogsTableProps {
  data: AILogRead[];
  meta?: PaginationMeta;
  providerFilter: AIProviderName | "all";
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onProviderFilterChange: (provider: AIProviderName | "all") => void;
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid grid-cols-5 gap-4 rounded-md border p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function AILogsTable({
  data,
  meta,
  providerFilter,
  isLoading,
  onPageChange,
  onProviderFilterChange,
}: AILogsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);

  const columns: Array<ColumnDef<AILogRead>> = [
    {
      accessorKey: "provider",
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Provider
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="capitalize">{row.original.provider}</span>,
    },
    {
      accessorKey: "model",
      header: "Model",
    },
    {
      id: "tokens",
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Tokens
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.prompt_tokens + row.completion_tokens,
      cell: ({ row }) => row.original.prompt_tokens + row.original.completion_tokens,
    },
    {
      accessorKey: "latency_ms",
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Latency (ms)
          <ArrowUpDown className="h-4 w-4" />
        </Button>
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
      cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy p"),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Logs</h2>
          <p className="text-sm text-muted-foreground">Browse real AI call history from `/api/v1/ai/logs`.</p>
        </div>
        <select
          value={providerFilter}
          onChange={(event) => onProviderFilterChange(event.target.value as AIProviderName | "all")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
        >
          <option value="all">All providers</option>
          <option value="mock">Mock</option>
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
          <option value="anthropic">Anthropic</option>
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
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No AI logs found for the selected provider.
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
          {meta ? ` • ${meta.total} total calls` : ""}
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
