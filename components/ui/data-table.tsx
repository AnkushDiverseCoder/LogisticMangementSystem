"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    state?: {
        sorting: SortingState;
    };
    onSortingChange?: (updater: React.SetStateAction<SortingState>) => void;
    enableSorting?: boolean; // optional
}

export function DataTable<TData, TValue>({
    columns,
    data,
    state,
    onSortingChange,
    enableSorting = false,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        state: state || {},
        onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    });

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const isSorted = header.column.getIsSorted(); // "asc" | "desc" | false
                                return (
                                    <TableHead
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className="cursor-pointer select-none"
                                    >
                                        <div className="flex items-center justify-between">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {isSorted ? (isSorted === "asc" ? " 🔼" : " 🔽") : null}
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                            >
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
