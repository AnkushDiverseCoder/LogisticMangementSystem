"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import tripService from "@/lib/tripService";
import authService from "@/lib/authService";

type Trip = {
    $id: string;
    userEmail: string;
    siteName: string;
    vehicleNumber: string;
    tripId: string;
    tripMethod: string;
    startKm: number;
    endKm?: number;
    distanceTravelled?: number;
    escort?: boolean;
    attached?: boolean;
    edited?: boolean;
    shiftTime?: string | null;
    $createdAt: string;
    $updatedAt: string;
};

export default function TripsTable() {
    const [data, setData] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});

    const [editOpen, setEditOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [editForm, setEditForm] = useState<Partial<Trip>>({});

    // ========================
    // Fetch Trips + Users
    // ========================
    const fetchTrips = useCallback(async () => {
        setLoading(true);
        try {
            let startISO = "";
            let endISO = "";

            if (filterDate) {
                const start = new Date(`${filterDate}T00:00:00`);
                const end = new Date(`${filterDate}T23:59:59.999`);
                startISO = start.toISOString();
                endISO = end.toISOString();
            }

            const res = await tripService.listTrips();

            if (!res.error) {
                let tripsRaw = res.data || [];
                // Map DefaultDocument[] to Trip[]
                let trips: Trip[] = tripsRaw.map((doc: any) => ({
                    $id: doc.$id,
                    userEmail: doc.userEmail,
                    siteName: doc.siteName,
                    vehicleNumber: doc.vehicleNumber,
                    tripId: doc.tripId,
                    tripMethod: doc.tripMethod,
                    startKm: doc.startKm,
                    endKm: doc.endKm,
                    distanceTravelled: doc.distanceTravelled,
                    escort: doc.escort,
                    attached: doc.attached,
                    edited: doc.edited,
                    shiftTime: doc.shiftTime,
                    $createdAt: doc.$createdAt,
                    $updatedAt: doc.$updatedAt,
                }));

                // Frontend sorting
                if (sorting.length > 0) {
                    trips = [...trips].sort((a, b) => {
                        for (const sort of sorting) {
                            const key = sort.id as keyof Trip;
                            const aVal = a[key];
                            const bVal = b[key];

                            // Handle null/undefined values
                            if (aVal == null && bVal == null) continue;
                            if (aVal == null) return sort.desc ? 1 : -1;
                            if (bVal == null) return sort.desc ? -1 : 1;

                            if (aVal > bVal) return sort.desc ? -1 : 1;
                            if (aVal < bVal) return sort.desc ? 1 : -1;
                        }
                        return 0;
                    });
                }

                setData(trips);

                // Fetch usernames mapping
                const emails = trips.map((t) => t.userEmail);
                const users = await authService.getUsersByEmails(emails);
                const map: Record<string, string> = {};
                emails.forEach((e) => {
                    map[e] = users[e]?.username ?? "";
                });
                setUsernameMap(map);
            } else {
                console.error("Trip service error:", res.error);
                setData([]);
            }
        } catch (err) {
            console.error("Error fetching trips:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [search, filterDate, page, pageSize, sorting]);

    useEffect(() => {
        fetchTrips();
    }, [fetchTrips]);

    // ========================
    // Delete
    // ========================
    const handleDelete = useCallback(
        async (tripId: string) => {
            if (!confirm("Are you sure you want to delete this trip?")) return;
            const res = await tripService.deleteTrip(tripId);
            if (!res.error) fetchTrips();
            else alert(res.error);
        },
        [fetchTrips]
    );

    // ========================
    // CSV Export
    // ========================
    const exportCSV = useCallback(
        <T extends object>(rows: T[], map?: Record<string, string>) => {
            if (!rows.length) return;

            const keys = Object.keys(rows[0]);
            const csvContent = [
                keys.map((k) => (k === "userEmail" ? "User (Email)" : k)).join(","),
                ...rows.map((row) =>
                    keys
                        .map((k) => {
                            if (k === "userEmail") {
                                const email = (row as any)[k] ?? "";
                                const username = map?.[email] ?? "";
                                return `"${username} (${email})"`;
                            }
                            return `"${(row as any)[k] ?? ""}"`;
                        })
                        .join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "trips.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        []
    );

    // ========================
    // Edit modal
    // ========================
    const openEdit = useCallback((trip: Trip) => {
        setEditingTrip(trip);
        setEditForm(trip);
        setEditOpen(true);
    }, []);

    const handleEditSave = useCallback(async () => {
        if (!editingTrip) return;
        const payload: Partial<Trip> = { ...editForm };
        if (!editForm.shiftTime) payload.shiftTime = editingTrip.shiftTime;

        const res = await tripService.updateTrip(editingTrip.$id, payload);
        if (!res.error) {
            setEditOpen(false);
            fetchTrips();
        } else {
            alert(res.error);
        }
    }, [editingTrip, editForm, fetchTrips]);

    // ========================
    // Columns
    // ========================
    const columns: ColumnDef<Trip>[] = useMemo(
        () => [
            { accessorKey: "tripId", header: "Trip ID", enableSorting: true },
            {
                accessorKey: "userEmail",
                header: "User Email",
                enableSorting: true,
                cell: ({ getValue }) => {
                    const email = getValue() as string;
                    const username = usernameMap[email] ?? "";
                    return `${username} (${email})`;
                },
            },
            { accessorKey: "siteName", header: "Site", enableSorting: true },
            { accessorKey: "vehicleNumber", header: "Vehicle", enableSorting: true },
            { accessorKey: "tripMethod", header: "Method", enableSorting: true },
            { accessorKey: "startKm", header: "Start Km", enableSorting: true },
            { accessorKey: "endKm", header: "End Km", enableSorting: true },
            { accessorKey: "distanceTravelled", header: "Distance", enableSorting: true },
            {
                accessorKey: "escort",
                header: "Escort",
                enableSorting: true,
                cell: ({ row }) => (row.original.escort ?? false ? "Yes" : "No"),
            },
            {
                accessorKey: "attached",
                header: "Attached",
                enableSorting: true,
                cell: ({ row }) => (row.original.attached ?? false ? "Yes" : "No"),
            },
            {
                accessorKey: "edited",
                header: "Edited",
                enableSorting: true,
                cell: ({ row }) => (row.original.edited ?? false ? "Yes" : "No"),
            },
            {
                accessorKey: "shiftTime",
                header: "Shift Time",
                enableSorting: true,
                cell: ({ getValue }) => {
                    const raw = getValue() as string | undefined | null;
                    if (!raw) return "-";
                    return new Date(raw).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                },
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
                            Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(row.original.$id)}>
                            Delete
                        </Button>
                    </div>
                ),
            },
        ],
        [usernameMap, openEdit, handleDelete]
    );

    // ========================
    // Render
    // ========================
    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search by site, vehicle, tripId..."
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
                <Button onClick={fetchTrips} disabled={loading}>
                    {loading ? "Loading..." : "Fetch"}
                </Button>
                <Button onClick={() => exportCSV(data, usernameMap)}>Export CSV</Button>
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

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Trip</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {(["userEmail", "siteName", "vehicleNumber", "tripId", "tripMethod", "startKm", "endKm", "distanceTravelled"] as (keyof Trip)[]).map(
                            (field) => (
                                <div key={field} className="grid gap-1">
                                    <Label htmlFor={field}>{field}</Label>
                                    <Input
                                        id={field}
                                        type={["startKm", "endKm", "distanceTravelled"].includes(field) ? "number" : "text"}
                                        value={
                                            typeof editForm[field] === "boolean"
                                                ? editForm[field]
                                                    ? "true"
                                                    : ""
                                                : editForm[field] ?? ""
                                        }
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                [field]: ["startKm", "endKm", "distanceTravelled"].includes(field)
                                                    ? Number(e.target.value)
                                                    : e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            )
                        )}
                        {(["escort", "attached", "edited"] as (keyof Trip)[]).map((field) => (
                            <div key={field} className="flex items-center gap-2">
                                <Switch
                                    id={field}
                                    checked={Boolean(editForm[field])}
                                    onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, [field]: checked }))}
                                />
                                <Label htmlFor={field}>{field}</Label>
                            </div>
                        ))}
                        <div className="grid gap-1">
                            <Label htmlFor="shiftTime">Shift Time</Label>
                            <Input
                                id="shiftTime"
                                type="datetime-local"
                                value={
                                    editForm.shiftTime
                                        ? new Date(editForm.shiftTime).toISOString().slice(0, 16)
                                        : editingTrip?.shiftTime
                                            ? new Date(editingTrip.shiftTime).toISOString().slice(0, 16)
                                            : ""
                                }
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        shiftTime: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
