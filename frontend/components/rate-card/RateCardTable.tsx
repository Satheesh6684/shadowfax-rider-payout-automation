"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, History, Pencil, Trash2 } from "lucide-react";
import { RateCard } from "@/lib/types";
import { formatCurrency, formatWeekRange } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface RateCardTableProps {
  data: RateCard[];
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onEdit: (rateCard: RateCard) => void;
  onDelete: (rateCard: RateCard) => void;
  onViewHistory: (rateCard: RateCard) => void;
  onRowClick?: (rateCard: RateCard) => void;
  canWrite?: boolean;
}

const columns: ColumnDef<RateCard>[] = [
  {
    id: "week",
    header: "Week",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatWeekRange(row.original.weekStartDate, row.original.weekEndDate)}
      </span>
    ),
  },
  {
    id: "city",
    header: "City",
    enableSorting: true,
    cell: ({ row }) => row.original.store.city.name,
  },
  {
    id: "storeName",
    header: "Store",
    enableSorting: true,
    cell: ({ row }) => row.original.store.storeName,
  },
  {
    id: "storeCode",
    header: "Store Code",
    enableSorting: true,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.store.storeCode}</span>,
  },
  { accessorKey: "rcType", header: "RC Type" },
  {
    id: "minimumOrders",
    header: "Min Orders",
    cell: ({ row }) => row.original.minimumOrders,
  },
  {
    id: "maximumOrders",
    header: "Max Orders",
    cell: ({ row }) => row.original.maximumOrders,
  },
  {
    id: "mgAmount",
    header: "MG",
    enableSorting: true,
    cell: ({ row }) => formatCurrency(row.original.mgAmount),
  },
  {
    id: "variablePay",
    header: "Variable",
    enableSorting: true,
    cell: ({ row }) => formatCurrency(row.original.variablePay),
  },
  {
    id: "weeklyIncentive",
    header: "Weekly Incentive",
    cell: ({ row }) => formatCurrency(row.original.weeklyIncentive),
  },
  {
    id: "orderIncentive",
    header: "Order Incentive",
    cell: ({ row }) => formatCurrency(row.original.orderIncentive),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function RateCardTable({
  data,
  isLoading,
  sorting,
  onSortingChange,
  onEdit,
  onDelete,
  onViewHistory,
  onRowClick,
  canWrite = true,
}: RateCardTableProps) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    manualSorting: true,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <TableSkeleton />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
        <p className="text-sm font-medium">No rate cards for this view yet.</p>
        <p className="mt-1 text-sm text-muted">Create one, or copy a previous week to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="sticky top-0 border-b border-border bg-surface">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th key={header.id} className="whitespace-nowrap px-4 py-3 font-medium text-muted">
                    {canSort ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === "asc" && <ArrowUp size={12} />}
                        {sortDir === "desc" && <ArrowDown size={12} />}
                        {!sortDir && <ArrowUpDown size={12} className="opacity-40" />}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
              <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={`border-b border-border last:border-0 hover:bg-background/60 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  <button
                    aria-label="View history"
                    onClick={() => onViewHistory(row.original)}
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                  >
                    <History size={15} />
                  </button>
                  <button
                    aria-label="Edit"
                    disabled={row.original.status === "LOCKED" || !canWrite}
                    onClick={() => onEdit(row.original)}
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    aria-label="Delete"
                    disabled={row.original.status === "LOCKED" || !canWrite}
                    onClick={() => onDelete(row.original)}
                    className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
