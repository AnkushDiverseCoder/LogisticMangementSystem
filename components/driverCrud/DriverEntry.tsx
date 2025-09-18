"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import driverService from "@/lib/driverDetails";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

type Driver = {
    $id: string;
    name: string;
    licenseNo: string;
    expiry: string;
    contactNo: number;
    emergencyContactNo?: number;
    licenseFile?: string;
    aadhaarFile?: string;
    photoFile?: string;
    $createdAt: string;
};

export default function DriverPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");

    // form + modal state
    const [form, setForm] = useState<any>({
        name: "",
        licenseNo: "",
        expiry: "",
        contactNo: "",
        emergencyContactNo: "",
    });
    const [editId, setEditId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    const licenseInputRef = useRef<HTMLInputElement>(null);
    const aadhaarInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadDrivers();
    }, []);

    const loadDrivers = async () => {
        setLoading(true);
        const res = await driverService.listDrivers();
        if (res.success) setDrivers(res.data);
        else toast.error(res.error);
        setLoading(false);
    };

    const validateForm = () => {
        if (!form.name || form.name.trim().length < 2)
            return "Name is required (min 2 chars)";
        if (!form.licenseNo) return "License number is required";
        if (!form.expiry) return "Expiry date is required";
        if (!/^\d{10}$/.test(form.contactNo))
            return "Contact number must be 10 digits";
        if (
            form.emergencyContactNo &&
            !/^\d{10}$/.test(form.emergencyContactNo)
        )
            return "Emergency contact must be 10 digits";
        if (
            form.contactNo &&
            form.emergencyContactNo &&
            form.contactNo === form.emergencyContactNo
        )
            return "Contact and Emergency Contact cannot be the same";
        return null;
    };

    const handleSubmit = async () => {
        const err = validateForm();
        if (err) {
            toast.error(err);
            return;
        }

        setLoading(true);
        const payload = {
            ...form,
            contactNo: form.contactNo ? parseInt(form.contactNo, 10) : null,
            emergencyContactNo: form.emergencyContactNo
                ? parseInt(form.emergencyContactNo, 10)
                : null,
        };

        const res = editId
            ? await driverService.updateDriver(editId, payload, licenseFile, aadhaarFile, photoFile)
            : await driverService.createDriver(payload, licenseFile, aadhaarFile, photoFile);

        setLoading(false);

        if (res.success) {
            toast.success(editId ? "Driver updated" : "Driver created");
            resetForm();
            loadDrivers();
            setDialogOpen(false);
        } else {
            toast.error(res.error);
        }
    };

    const resetForm = () => {
        setForm({
            name: "",
            licenseNo: "",
            expiry: "",
            contactNo: "",
            emergencyContactNo: "",
        });
        setLicenseFile(null);
        setAadhaarFile(null);
        setPhotoFile(null);
        setEditId(null);
        if (licenseInputRef.current) licenseInputRef.current.value = "";
        if (aadhaarInputRef.current) aadhaarInputRef.current.value = "";
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleDelete = async (driver: Driver) => {
        setLoading(true);
        const res = await driverService.deleteDriver(driver.$id);
        setLoading(false);
        if (res.success) {
            toast.success("Driver deleted");
            loadDrivers();
        } else toast.error(res.error);
    };

    const columns = [
        { header: "Name", accessorKey: "name" },
        { header: "License No", accessorKey: "licenseNo" },
        {
            header: "Expiry", accessorKey: "expiry",
            cell: ({ row }: any) => (
                <span>{format(new Date(row.original.expiry), "dd/MM/yyyy")}</span>
            )
        },
        { header: "Contact", accessorKey: "contactNo" },
        { header: "Emergency", accessorKey: "emergencyContactNo" },
        {
            header: "Docs",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    {row.original.licenseFile && (
                        <Button
                            size="sm"
                            onClick={() => driverService.downloadFile(row.original.licenseFile)}
                        >
                            License
                        </Button>
                    )}
                    {row.original.aadhaarFile && (
                        <Button
                            size="sm"
                            onClick={() => driverService.downloadFile(row.original.aadhaarFile)}
                        >
                            Aadhaar
                        </Button>
                    )}
                    {row.original.photoFile && (
                        <Button
                            size="sm"
                            onClick={() => driverService.downloadFile(row.original.photoFile)}
                        >
                            Photo
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => driverService.downloadAllFiles(row.original)}
                    >
                        All
                    </Button>
                </div>
            ),
        },
        {
            header: "Actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => {
                            setForm(row.original);
                            setEditId(row.original.$id);
                            setDialogOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(row.original)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    const filteredData = drivers.filter((d) =>
        d.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Driver Management</h1>

            <div className="flex gap-2">
                <Input
                    placeholder="Filter by name..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <Button className="bg-slate-900" onClick={() => setDialogOpen(true)}>+ New Driver</Button>
            </div>

            <div className="bg-white border rounded-md p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <DataTable columns={columns} data={filteredData} />
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editId ? "Edit Driver" : "New Driver"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <Input
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <Input
                            placeholder="License No"
                            value={form.licenseNo}
                            onChange={(e) => setForm({ ...form, licenseNo: e.target.value })}
                        />
                        <Input
                            type="date"
                            value={form.expiry}
                            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                        />
                        <Input
                            placeholder="Contact No"
                            value={form.contactNo}
                            onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
                        />
                        <Input
                            placeholder="Emergency Contact No"
                            value={form.emergencyContactNo}
                            onChange={(e) =>
                                setForm({ ...form, emergencyContactNo: e.target.value })
                            }
                        />
                        <input
                            type="file"
                            ref={licenseInputRef}
                            onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                        />
                        <input
                            type="file"
                            ref={aadhaarInputRef}
                            onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                        />
                        <input
                            type="file"
                            ref={photoInputRef}
                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : editId ? (
                                "Update"
                            ) : (
                                "Create"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
