"use client";

import React, { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import userComplaintService from "@/lib/userComplaintService";
import authService from "@/lib/authService";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Complaint = {
    $id?: string;
    userEmail: string;
    displayName: string;
    date: string;
    reason: string;
    RPDisplayName: string;
    RPEmail: string;
    $createdAt?: string;
};

type UserOption = {
    $id: string;
    displayName: string;
    email: string;
};

export default function EmployeeComplaintCrud() {
    const authUser = Cookies.get("authUser") ? JSON.parse(Cookies.get("authUser")!) : null;

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editComplaint, setEditComplaint] = useState<Partial<Complaint>>({});
    const [isNew, setIsNew] = useState(false);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState("");

    // Fetch complaints
    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const res = await userComplaintService.listUserComplaints();
            if (res.success && Array.isArray(res.data?.data)) {
                setComplaints(res.data?.data.sort((a: Complaint, b: Complaint) =>
                    new Date(b.$createdAt!).getTime() - new Date(a.$createdAt!).getTime()
                ));
            } else {
                setComplaints([]);
            }
        } catch (err) {
            console.error(err);
            setComplaints([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch users for dropdown
    const fetchUsers = async () => {
        const res = await authService.fetchAllUsers();
        if (res.success && res.data) {
            setUsers(res.data);
            // setUsers(res.data.filter((u: any) => u.labels.includes("employee")) as UserOption[]);
        } else {
            setUsers([]);
        }
    };

    useEffect(() => {
        fetchComplaints();
        fetchUsers();
    }, []);

    // Delete complaint
    const handleDelete = async ($id: string) => {
        if (!confirm("Are you sure you want to delete this complaint?")) return;
        const res = await userComplaintService.deleteUserComplaint($id);
        if (res.success) fetchComplaints();
        else alert(res.error);
    };

    // Open dialog
    const openDialog = (complaint?: Complaint) => {
        if (complaint) {
            setEditComplaint(complaint);
            setIsNew(false);
        } else {
            setEditComplaint({
                RPEmail: authUser?.email || "",
                RPDisplayName: authUser?.displayName || "",
                date: new Date().toISOString().split("T")[0],
            });
            setIsNew(true);
        }
        setEditOpen(true);
    };

    // Save complaint
    const handleSave = async () => {
        const { userEmail, displayName, date, reason } = editComplaint;
        if (!userEmail || !displayName || !date || !reason) {
            alert("Please fill all required fields");
            return;
        }

        let res;
        if (isNew) res = await userComplaintService.createUserComplaint(editComplaint);
        else if (editComplaint.$id) res = await userComplaintService.updateUserComplaint(editComplaint.$id, editComplaint);

        if (res?.success) {
            setEditOpen(false);
            fetchComplaints();
        } else {
            alert(res?.error || "Operation failed");
        }
    };

    // Filtered complaints
    const filteredComplaints = useMemo(
        () =>
            complaints.filter(
                (c) =>
                    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
                    c.userEmail.toLowerCase().includes(search.toLowerCase()) ||
                    c.reason.toLowerCase().includes(search.toLowerCase())
            ),
        [complaints, search]
    );

    // Table Columns
    const columns: ColumnDef<Complaint>[] = [
        { accessorKey: "displayName", header: "Employee Name" },
        { accessorKey: "userEmail", header: "Email" },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => {
                const rawDate = row.original.date;
                return rawDate ? format(new Date(rawDate), "dd/MM/yyyy") : "-";
            },
        },
        {
            accessorKey: "reason",
            header: "Reason",
            cell: ({ row }) => <div className="max-w-lg break-words">{row.original.reason}</div>,
        },
        {
            accessorKey: "RPDisplayName",
            header: "Reported By",
            cell: ({ row }) => <Badge variant="secondary">{row.original.RPDisplayName}</Badge>,
        },
        { accessorKey: "RPEmail", header: "RP Email" },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => openDialog(row.original)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.$id!)}>Delete</Button>
                </div>
            ),
        },
    ];

    return (
        <div className="container mx-auto py-10 space-y-6">
            {/* Header: Search + Add Button */}
            <div className="flex flex-wrap gap-2 items-center">
                <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Button onClick={() => openDialog()} disabled={loading}>Add Complaint</Button>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={filteredComplaints} />

            {/* Add/Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isNew ? "Add Complaint" : "Edit Complaint"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Employee Dropdown with search */}
                        <div className="grid gap-1">
                            <Label>Employee</Label>
                            <Select
                                value={editComplaint.userEmail || ""}
                                onValueChange={(val) => {
                                    const selected = users.find((u) => u.email === val);
                                    setEditComplaint({
                                        ...editComplaint,
                                        userEmail: val,
                                        displayName: selected?.displayName || "",
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <div className="p-2">
                                        <Input
                                            placeholder="Search employee..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    {users
                                        .filter(
                                            (u) =>
                                                u.displayName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                                                u.email.toLowerCase().includes(employeeSearch.toLowerCase())
                                        )
                                        .map((u) => (
                                            <SelectItem key={u.$id} value={u.email}>
                                                {u.displayName} ({u.email})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={editComplaint.date || ""}
                                onChange={(e) => setEditComplaint({ ...editComplaint, date: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="reason">Reason</Label>
                            <Input
                                id="reason"
                                value={editComplaint.reason || ""}
                                onChange={(e) => setEditComplaint({ ...editComplaint, reason: e.target.value })}
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
