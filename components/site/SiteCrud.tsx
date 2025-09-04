"use client";

import React, { useEffect, useState, useMemo } from "react";
import clientService from "@/lib/clientService";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Client = {
    $id: string;
    siteName: string;
    $createdAt?: string;
    $updatedAt?: string;
};

export default function SiteCrud() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editClient, setEditClient] = useState<Partial<Client>>({});
    const [isNew, setIsNew] = useState(false);

    // ==============================
    // Fetch clients
    // ==============================
    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await clientService.listClients();
            if (res.success && Array.isArray(res.data?.data)) {
                setClients(res.data.data);
            } else {
                setClients([]);
            }
        } catch (err) {
            console.error(err);
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // ==============================
    // Delete client
    // ==============================
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this client?")) return;
        const res = await clientService.deleteClient(id);
        if (res.success) fetchClients();
        else alert(res.error);
    };

    // ==============================
    // Open dialog
    // ==============================
    const openDialog = (client?: Client) => {
        if (client) {
            setEditClient(client);
            setIsNew(false);
        } else {
            setEditClient({});
            setIsNew(true);
        }
        setEditOpen(true);
    };

    // ==============================
    // Save client
    // ==============================
    const handleSave = async () => {
        let res;
        if (isNew) res = await clientService.createClient(editClient);
        else if (editClient.$id) res = await clientService.updateClient(editClient.$id, editClient);

        if (res?.success) {
            setEditOpen(false);
            fetchClients();
        } else {
            alert(res?.error || "Operation failed");
        }
    };

    // ==============================
    // Filtered Clients
    // ==============================
    const filteredClients = useMemo(() => {
        return clients.filter((c) =>
            c.siteName?.toLowerCase().includes(search.toLowerCase())
        );
    }, [clients, search]);

    // ==============================
    // DataTable Columns
    // ==============================
    const columns: ColumnDef<Client>[] = [
        { accessorKey: "siteName", header: "Site Name" },
        { accessorKey: "$createdAt", header: "Created At" },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => openDialog(row.original)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.$id)}>Delete</Button>
                </div>
            ),
        },
    ];

    // ==============================
    // Render
    // ==============================
    return (
        <div className="p-6 space-y-6">
            {/* Header: Search + Buttons */}
            <div className="flex gap-2 items-center">
                <Input
                    placeholder="Search clients by site name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Button onClick={() => openDialog()} disabled={loading}>Add Site</Button>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={filteredClients} />

            {/* Add/Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isNew ? "Add Client" : "Edit Client"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid gap-1">
                            <Label htmlFor="siteName">Site Name</Label>
                            <Input
                                id="siteName"
                                value={editClient.siteName ?? ""}
                                onChange={(e) => setEditClient({ ...editClient, siteName: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>{isNew ? "Add" : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
