"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import vehicleService from "@/lib/vehicleService";
import vExpenseService from "@/lib/vExpenseService";
import { format, parseISO } from "date-fns";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Inline type
export type VExpense = {
    $id: string;
    vehicleNumber: string;
    vehicleType: string;
    labels?: string;
    mileage?: number;
    date?: string; // datetime
    particular?: string;
    amount?: number;
    garage?: string;
};

export default function VExpensePage() {
    const [expenses, setExpenses] = useState<VExpense[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<VExpense>>({});
    const [editOpen, setEditOpen] = useState(false);
    const [editExpense, setEditExpense] = useState<VExpense | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<VExpense | null>(null);

    useEffect(() => {
        loadVehicles();
        loadExpenses();
    }, []);

    const loadVehicles = async () => {
        const res = await vehicleService.listVehicles();
        if (res.success && res.data?.data) {
            setVehicles(res.data.data);
        } else toast.error(res.error || "Failed to load vehicles");
    };

    const loadExpenses = async () => {
        const res = await vExpenseService.list();
        if (res.success && res.data?.documents) {
            setExpenses(res.data.documents as unknown as VExpense[]);
        } else toast.error(res.error || "Failed to load expenses");
    };

    const handleChange = (key: keyof VExpense, value: any) => {
        setFormData({ ...formData, [key]: value });
    };

    const handleSubmit = async () => {
        if (!formData.vehicleNumber) {
            toast.error("Vehicle is required");
            return;
        }
        const payload = { ...formData };
        const res = editExpense
            ? await vExpenseService.update(editExpense.$id, payload)
            : await vExpenseService.create(payload);

        if (res.success) {
            toast.success(editExpense ? "Expense updated" : "Expense added");
            setFormData({});
            setEditExpense(null);
            setEditOpen(false);
            await loadExpenses();
        } else toast.error(res.error || "Failed to save");
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;
        const res = await vExpenseService.delete(expenseToDelete.$id);
        if (res.success) {
            toast.success("Deleted successfully");
            await loadExpenses();
        } else toast.error(res.error || "Failed to delete");
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
    };

    const columns = [
        { header: "Vehicle No", accessorKey: "vehicleNumber" },
        { header: "Vehicle Type", accessorKey: "vehicleType" },
        { header: "Mileage", accessorKey: "mileage" },
        { header: "Labels", accessorKey: "labels" },
        {
            header: "Date",
            accessorKey: "date",
            cell: ({ row }: any) =>
                row.original.date ? format(parseISO(row.original.date), "yyyy-MM-dd HH:mm") : "—",
        },
        { header: "Particular", accessorKey: "particular" },
        { header: "Amount", accessorKey: "amount" },
        { header: "Garage", accessorKey: "garage" },
        {
            header: "Actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setEditExpense(row.original);
                            setFormData(row.original);
                            setEditOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                            setExpenseToDelete(row.original);
                            setDeleteDialogOpen(true);
                        }}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-8 px-6">
                {/* Banner */}
                <div className="rounded-md overflow-hidden mb-6">
                    <div
                        className="w-full h-44 flex items-center px-6"
                        style={{
                            backgroundImage:
                                "linear-gradient(90deg, rgba(2,6,23,0.88), rgba(2,6,23,0.6)), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <div>
                            <h1 className="text-3xl font-semibold text-white">Vehicle Expenses</h1>
                            <p className="text-sm text-slate-200 mt-1">
                                Track all expenses for your vehicles.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white border border-slate-200 rounded-md px-6 py-5 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Vehicle</Label>
                            <Select
                                value={formData.vehicleNumber || ""}
                                onValueChange={(val) => {
                                    const v = vehicles.find((v) => v.vehicleNumber === val);
                                    setFormData({
                                        ...formData,
                                        vehicleNumber: v.vehicleNumber,
                                        vehicleType: v.vehicleType,
                                        mileage: v.mileage,
                                        labels: v.labels,
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((v) => (
                                        <SelectItem key={v.$id} value={v.vehicleNumber}>
                                            {v.vehicleNumber} ({v.vehicleType})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Mileage</Label>
                            <Input
                                type="number"
                                value={formData.mileage || ""}
                                onChange={(e) => handleChange("mileage", Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <Label>Labels</Label>
                            <Input
                                value={formData.labels || ""}
                                onChange={(e) => handleChange("labels", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Date</Label>
                            <Input
                                type="datetime-local"
                                value={formData.date || ""}
                                onChange={(e) => handleChange("date", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Particular</Label>
                            <Input
                                value={formData.particular || ""}
                                onChange={(e) => handleChange("particular", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={formData.amount || ""}
                                onChange={(e) => handleChange("amount", Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <Label>Garage</Label>
                            <Input
                                value={formData.garage || ""}
                                onChange={(e) => handleChange("garage", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSubmit}>
                            {editExpense ? "Update Expense" : "Add Expense"}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-md px-6 py-4 overflow-x-auto">
                    <div className="min-w-[1000px]">
                        <DataTable columns={columns} data={expenses} />
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Expense</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(formData)
                            .filter((key) => !key.startsWith("$"))
                            .map((key) => (
                                <div key={key}>
                                    <Label>{key}</Label>
                                    <Input
                                        type={
                                            key === "amount" || key === "mileage"
                                                ? "number"
                                                : key === "date"
                                                    ? "datetime-local"
                                                    : "text"
                                        }
                                        value={(formData as any)[key] || ""}
                                        onChange={(e) =>
                                            handleChange(
                                                key as keyof VExpense,
                                                key === "amount" || key === "mileage"
                                                    ? Number(e.target.value)
                                                    : e.target.value
                                            )
                                        }
                                    />
                                </div>
                            ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <div>Are you sure you want to delete this expense?</div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
