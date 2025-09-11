"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import vdocumentstatusService from "@/lib/vDocumentStatusService";
import { format, parseISO, isBefore } from "date-fns";

// Inline type
export type VDocumentStatus = {
    $id: string;
    vehicleNumber: string;
    vehicleType: string;
    labels?: string;
    mileage?: number;
    MfgYear?: string;
    RcValidity?: string;
    PermitValidity?: string;
    FitnessValidity?: string;
    TaxValidity?: string;
    InsuranceValidity?: string;
    PucValidity?: string;
};

export default function VDocumentStatusPage() {
    const [documents, setDocuments] = useState<VDocumentStatus[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<VDocumentStatus>>({});
    const [editOpen, setEditOpen] = useState(false);
    const [editDoc, setEditDoc] = useState<VDocumentStatus | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<VDocumentStatus | null>(null);
    const [showExpiredOnly, setShowExpiredOnly] = useState(false);

    // Load vehicles + docs
    useEffect(() => {
        loadVehicles();
        loadDocs();
    }, []);

    const loadVehicles = async () => {
        const res = await vehicleService.listVehicles();
        if (res.success && res.data?.data) {
            setVehicles(res.data.data);
        } else toast.error(res.error || "Failed to load vehicles");
    };

    const loadDocs = async () => {
        const res = await vdocumentstatusService.list();
        if (res.success && res.data?.data) {
            // TypeScript cast
            setDocuments(res.data.data as unknown as VDocumentStatus[]);
        } else toast.error(res.error || "Failed to load documents");
    };

    const handleChange = (key: keyof VDocumentStatus, value: any) => {
        setFormData({ ...formData, [key]: value });
    };

    const handleSubmit = async () => {
        if (!formData.vehicleNumber) {
            toast.error("Vehicle is required");
            return;
        }
        const payload = { ...formData };
        const res = editDoc
            ? await vdocumentstatusService.update(editDoc.$id, payload)
            : await vdocumentstatusService.create(payload);

        if (res.success) {
            toast.success(editDoc ? "Document updated" : "Document created");
            setFormData({});
            setEditDoc(null);
            setEditOpen(false);
            await loadDocs();
        } else toast.error(res.error || "Failed to save");
    };

    const handleDelete = async () => {
        if (!docToDelete) return;
        const res = await vdocumentstatusService.delete(docToDelete.$id);
        if (res.success) {
            toast.success("Deleted successfully");
            await loadDocs();
        } else toast.error(res.error || "Failed to delete");
        setDeleteDialogOpen(false);
        setDocToDelete(null);
    };

    // Filter expired docs
    const filteredDocs = useMemo(() => {
        let data = documents.map((doc) => ({
            ...doc,
            isExpired: [
                "RcValidity",
                "PermitValidity",
                "FitnessValidity",
                "TaxValidity",
                "InsuranceValidity",
                "PucValidity",
            ].some((field) => {
                const val = (doc as any)[field];
                return val && isBefore(parseISO(val), new Date());
            }),
        }));

        if (showExpiredOnly) {
            data = data.filter((d) => d.isExpired);
        }

        // Sort expired first
        return data.sort((a, b) => Number(b.isExpired) - Number(a.isExpired));
    }, [documents, showExpiredOnly]);

    const columns = [
        { header: "Vehicle No", accessorKey: "vehicleNumber" },
        { header: "Vehicle Type", accessorKey: "vehicleType" },
        { header: "Mileage", accessorKey: "mileage" },
        { header: "Labels", accessorKey: "labels" },
        ...[
            "MfgYear",
            "RcValidity",
            "PermitValidity",
            "FitnessValidity",
            "TaxValidity",
            "InsuranceValidity",
            "PucValidity",
        ].map((field) => ({
            header: field,
            accessorKey: field,
            cell: ({ row }: any) => {
                const val = row.original[field];
                if (!val) return <span className="text-slate-400">—</span>;
                const expired = isBefore(parseISO(val), new Date());
                return (
                    <span className={expired ? "text-red-600 font-medium" : "text-green-600"}>
                        {format(parseISO(val), "yyyy-MM-dd")}
                    </span>
                );
            },
        })),
        {
            header: "Actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            const { isExpired, ...rest } = row.original; // remove frontend-only field
                            setEditDoc(rest as VDocumentStatus);
                            setFormData(rest as Partial<VDocumentStatus>);
                            setEditOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                            setDocToDelete(row.original);
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
                                "linear-gradient(90deg, rgba(2,6,23,0.88), rgba(2,6,23,0.6)), url('https://images.unsplash.com/photo-1549921296-3a1bd43192f6?auto=format&fit=crop&w=1600&q=80')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <div>
                            <h1 className="text-3xl font-semibold text-white">
                                Vehicle Document Status
                            </h1>
                            <p className="text-sm text-slate-200 mt-1">
                                Track and manage all vehicle documents in one place.
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

                        {[
                            "MfgYear",
                            "RcValidity",
                            "PermitValidity",
                            "FitnessValidity",
                            "TaxValidity",
                            "InsuranceValidity",
                            "PucValidity",
                        ].map((field) => (
                            <div key={field}>
                                <Label>{field}</Label>
                                <Input
                                    type="date"
                                    value={
                                        formData[field as keyof VDocumentStatus]
                                            ? format(
                                                parseISO(
                                                    formData[field as keyof VDocumentStatus] as string
                                                ),
                                                "yyyy-MM-dd"
                                            )
                                            : ""
                                    }
                                    onChange={(e) =>
                                        handleChange(field as keyof VDocumentStatus, e.target.value)
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSubmit}>
                            {editDoc ? "Update Document" : "Add Document"}
                        </Button>
                    </div>
                </div>

                {/* Toggle */}
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-slate-700">
                        Showing {filteredDocs.length} result
                        {filteredDocs.length !== 1 ? "s" : ""}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExpiredOnly(!showExpiredOnly)}
                    >
                        {showExpiredOnly ? "Show All" : "Show Only Expired"}
                    </Button>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-md px-6 py-4 overflow-x-auto">
                    <div className="min-w-[1200px]">
                        <DataTable columns={columns} data={filteredDocs} />
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Document</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(formData)
                            .filter(
                                (key) =>
                                    !key.startsWith("$") &&
                                    key !== "vehicleNumber" &&
                                    key !== "vehicleType"
                            )
                            .map((key) => (
                                <div key={key}>
                                    <Label>{key}</Label>
                                    <Input
                                        type={
                                            key.includes("Validity") || key === "MfgYear"
                                                ? "date"
                                                : "text"
                                        }
                                        value={(formData as any)[key] || ""}
                                        onChange={(e) =>
                                            handleChange(key as keyof VDocumentStatus, e.target.value)
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
                    <div>Are you sure you want to delete this record?</div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
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
