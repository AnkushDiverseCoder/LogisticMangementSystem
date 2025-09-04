"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [editForm, setEditForm] = useState<Partial<Trip>>({});

    // ========================
    // Fetch Trips + Usernames
    // ========================
    const fetchTrips = async () => {
        setLoading(true);
        try {
            let startISO: string | undefined;
            let endISO: string | undefined;

            if (filterDate) {
                const start = new Date(filterDate + "T00:00:00");
                const end = new Date(filterDate + "T23:59:59.999");
                startISO = start.toISOString();
                endISO = end.toISOString();
            }

            const res = await tripService.searchTrips({
                search,
                pageNumber: page,
                pageSize,
                startDate: startISO,
                endDate: endISO,
            });

            if (!res.error) {
                let trips = res.data || [];

                // Frontend sorting
                if (sorting.length > 0) {
                    trips = [...trips].sort((a: Trip, b: Trip) => {
                        for (const sort of sorting) {
                            const { id, desc } = sort;
                            const aVal = (a as any)[id];
                            const bVal = (b as any)[id];
                            if (aVal > bVal) return desc ? -1 : 1;
                            if (aVal < bVal) return desc ? 1 : -1;
                        }
                        return 0;
                    });
                }

                setData(trips);

                // Fetch usernames mapping
                const emails: string[] = trips.map((t: Trip) => t.userEmail);
                const users = await authService.getUsersByEmails(emails);
                const map: Record<string, string> = {};
                emails.forEach((e: string) => {
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
    };

    useEffect(() => {
        fetchTrips();
    }, [search, filterDate, page, sorting]);

    // ========================
    // Delete
    // ========================
    const handleDelete = async (tripId: string) => {
        if (!confirm("Are you sure you want to delete this trip?")) return;
        const res = await tripService.deleteTrip(tripId);
        if (!res.error) fetchTrips();
        else alert(res.error);
    };

    // ========================
    // CSV Export
    // ========================
    const exportCSV = <T extends object>(data: T[], usernameMap?: Record<string, string>) => {
        if (!data.length) return;

        const keys = Object.keys(data[0]);
        const csvContent = [
            keys.map(k => k === "userEmail" ? "User (Email)" : k).join(","),
            ...data.map((row: T) =>
                keys.map(k => {
                    if (k === "userEmail") {
                        const email = (row as any)[k] ?? "";
                        const username = usernameMap?.[email] ?? "";
                        return `"${username} (${email})"`;
                    }
                    return `"${(row as any)[k] ?? ""}"`;
                }).join(",")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "trips.csv");
        link.click();
    };

    // ========================
    // Edit modal
    // ========================
    const openEdit = (trip: Trip) => {
        setEditingTrip(trip);
        setEditForm(trip);
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingTrip) return;
        const payload = { ...editForm };
        if (!editForm.shiftTime) payload.shiftTime = editingTrip.shiftTime;

        const res = await tripService.updateTrip(editingTrip.$id, payload);
        if (!res.error) {
            setEditOpen(false);
            fetchTrips();
        } else {
            alert(res.error);
        }
    };

    // ========================
    // Columns
    // ========================
    const columns: ColumnDef<Trip>[] = useMemo(() => [
        { accessorKey: "tripId", header: "Trip ID", enableSorting: true },
        {
            accessorKey: "userEmail",
            header: "User Email",
            enableSorting: true,
            cell: ({ getValue }) => {
                const email = getValue() as string;
                const username = usernameMap[email] ?? "";
                return `${username} (${email})`;
            }
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
            cell: ({ row }) => ((row.original.escort ?? false) ? "Yes" : "No")
        },
        {
            accessorKey: "attached",
            header: "Attached",
            enableSorting: true,
            cell: ({ row }) => ((row.original.attached ?? false) ? "Yes" : "No")
        },
        {
            accessorKey: "edited",
            header: "Edited",
            enableSorting: true,
            cell: ({ row }) => ((row.original.edited ?? false) ? "Yes" : "No")
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
            }
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(row.original.$id)}>Delete</Button>
                </div>
            )
        }
    ], [usernameMap]);

    // ========================
    // Render
    // ========================
    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search by site, vehicle, tripId..."
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPage(1); setSearch(e.target.value); }}
                    className="max-w-sm"
                />
                <Input
                    type="date"
                    className="max-w-xs"
                    value={filterDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPage(1); setFilterDate(e.target.value); }}
                />
                <Button onClick={fetchTrips} disabled={loading}>{loading ? "Loading..." : "Fetch"}</Button>
                <Button onClick={() => exportCSV(data, usernameMap)}>Export CSV</Button>
            </div>

            <DataTable columns={columns} data={data} state={{ sorting }} onSortingChange={setSorting} />

            <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</Button>
                <span>Page {page}</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading || data.length < pageSize}>Next</Button>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Edit Trip</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        {["userEmail","siteName","vehicleNumber","tripId","tripMethod","startKm","endKm","distanceTravelled"].map((field: string) => (
                            <div key={field} className="grid gap-1">
                                <Label htmlFor={field}>{field}</Label>
                                <Input
                                    id={field}
                                    type={["startKm","endKm","distanceTravelled"].includes(field) ? "number" : "text"}
                                    value={(editForm as any)[field] ?? ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setEditForm(prev => ({ ...prev, [field]: ["startKm","endKm","distanceTravelled"].includes(field) ? Number(e.target.value) : e.target.value }))
                                    }
                                />
                            </div>
                        ))}
                        {["escort","attached","edited"].map((field: string) => (
                            <div key={field} className="flex items-center gap-2">
                                <Switch id={field} checked={(editForm as any)[field] ?? false} onCheckedChange={checked => setEditForm(prev => ({ ...prev, [field]: checked }))} />
                                <Label htmlFor={field}>{field}</Label>
                            </div>
                        ))}
                        <div className="grid gap-1">
                            <Label htmlFor="shiftTime">Shift Time</Label>
                            <Input
                                id="shiftTime"
                                type="datetime-local"
                                value={editForm.shiftTime ? new Date(editForm.shiftTime).toISOString().slice(0,16) : editingTrip?.shiftTime ? new Date(editingTrip.shiftTime).toISOString().slice(0,16) : ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditForm(prev => ({ ...prev, shiftTime: e.target.value ? new Date(e.target.value).toISOString() : undefined }))
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
