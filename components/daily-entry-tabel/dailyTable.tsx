"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import dailyEntryFormService from "@/lib/dailyEntryFormService";
import authService from "@/lib/authService";

// Inline type for DailyEntry
type DailyEntry = {
    $id: string;
    userEmail: string;
    vehicleNumber: string;
    vehicleType: string;
    meterReading: number;
    fuelQuantity?: number;
    mileage?: number;
    totalDistance?: number;
    reqTripCount?: number;
    escort?: boolean;
    attached?: boolean;
    edited?: boolean;
    createdAt: string;
    $createdAt: string;
    $updatedAt: string;
};

export default function DailyEntryTable() {
    const [data, setData] = useState<DailyEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});

    // Fetch username mapping once
    const fetchUsernames = async () => {
        const emails = data.map(d => d.userEmail);
        if (!emails.length) return;
        const map = await authService.getUsersByEmails(emails);
        const usernameMap: Record<string, string> = {};
        for (const email of Object.keys(map)) {
            usernameMap[email] = map[email]?.username || "";
        }
        setUsernameMap(usernameMap);
    };

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const res = await dailyEntryFormService.listDailyEntryPagination(page, pageSize);
            if (!res.error) {
                let entries = res.data || [];

                if (search.trim()) {
                    const lower = search.toLowerCase();
                    entries = entries.filter(
                        (e: DailyEntry) =>
                            e.vehicleNumber.toLowerCase().includes(lower) ||
                            e.userEmail.toLowerCase().includes(lower) ||
                            e.vehicleType.toLowerCase().includes(lower)
                    );
                }

                if (filterDate) {
                    const start = new Date(filterDate + "T00:00:00");
                    const end = new Date(filterDate + "T23:59:59.999");
                    entries = entries.filter(
                        (e: DailyEntry) => new Date(e.createdAt) >= start && new Date(e.createdAt) <= end
                    );
                }

                if (sorting.length > 0) {
                    entries = [...entries].sort((a, b) => {
                        for (const sort of sorting) {
                            const { id, desc } = sort;
                            let aVal: any = id === "userEmail" ? usernameMap[a.userEmail] : a[id as keyof DailyEntry];
                            let bVal: any = id === "userEmail" ? usernameMap[b.userEmail] : b[id as keyof DailyEntry];
                            if (aVal > bVal) return desc ? -1 : 1;
                            if (aVal < bVal) return desc ? 1 : -1;
                        }
                        return 0;
                    });
                }

                setData(entries);
            } else {
                console.error("Service error:", res.error);
                setData([]);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, [search, filterDate, page, sorting]);

    useEffect(() => {
        fetchUsernames();
    }, [data]);

    const handleDelete = async ($id: string) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;
        const res = await dailyEntryFormService.deleteDailyEntry($id);
        if (!res.error) fetchEntries();
        else alert(res.error);
    };

    const columns: ColumnDef<DailyEntry>[] = useMemo(
        () => [
            { accessorKey: "userEmail", header: "User Email", enableSorting: true },
            { accessorKey: "vehicleNumber", header: "Vehicle Number", enableSorting: true },
            { accessorKey: "vehicleType", header: "Vehicle Type", enableSorting: true },
            { accessorKey: "meterReading", header: "Meter Reading", enableSorting: true },
            { accessorKey: "fuelQuantity", header: "Fuel Qty", enableSorting: true },
            { accessorKey: "mileage", header: "Mileage", enableSorting: true },
            { accessorKey: "totalDistance", header: "Total Distance", enableSorting: true },
            { accessorKey: "reqTripCount", header: "Req Trip Count", enableSorting: true },
            {
                accessorKey: "createdAt",
                header: "Created At",
                enableSorting: true,
                cell: ({ getValue }) => {
                    const raw = getValue() as string | undefined;
                    return raw
                        ? new Date(raw).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "-";
                },
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(row.original.$id!)}
                        >
                            Delete
                        </Button>
                    </div>
                ),
            },
        ],
        [usernameMap]
    );

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search by vehicle, user, or type..."
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                    className="max-w-sm"
                />
                <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                        setPage(1);
                        setFilterDate(e.target.value);
                    }}
                    className="max-w-xs"
                />
                <Button onClick={fetchEntries} disabled={loading}>
                    {loading ? "Loading..." : "Fetch"}
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => exportToCSV(data, usernameMap, "daily_entries.csv")}
                >
                    Export CSV
                </Button>
            </div>

            <DataTable columns={columns} data={data} state={{ sorting }} onSortingChange={setSorting} />

            <div className="flex justify-between items-center pt-4">
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                >
                    Previous
                </Button>
                <span>Page {page}</span>
                <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading || data.length < pageSize}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
