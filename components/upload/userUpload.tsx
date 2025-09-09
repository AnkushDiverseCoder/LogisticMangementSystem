"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import fileService from "@/lib/fileService";
import authService from "@/lib/authService";
import vehicleService from "@/lib/vehicleService";

type User = {
    $id: string;
    username: string;
    email: string;
};

type Vehicle = {
    $id: string;
    vehicleNumber: string;
    vehicleType: string;
    mileage: number;
    labels: string[];
};

type FileMeta = {
    $id: string;
    fileId: string;
    userId: string;
    username: string;
    email: string;
    originalName: string;
    size: number;
    mileage?: number;
    vehicleNumber?: string;
    vehicleType?: string;
    labels?: string[];
    $createdAt: string;
    downloadUrl: string;
};

export default function FileManagerPage() {
    const [files, setFiles] = useState<FileMeta[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [searchUserUpload, setSearchUserUpload] = useState("");
    const [searchVehicleUpload, setSearchVehicleUpload] = useState("");
    const [filterUsers, setFilterUsers] = useState<string[]>([]);
    const [filterVehicles, setFilterVehicles] = useState<string[]>([]);
    const [searchFilterUsers, setSearchFilterUsers] = useState("");
    const [searchFilterVehicles, setSearchFilterVehicles] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [filters, setFilters] = useState({ filename: "" });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileMeta | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data
    useEffect(() => {
        loadUsers();
        loadVehicles();
        loadFiles();
    }, []);

    const loadUsers = async () => {
        const res = await authService.fetchAllUsers();
        if (res.success && res.data) setUsers(res.data);
        else toast.error(res.error || "Failed to load users");
    };

    const loadVehicles = async () => {
        const res = await vehicleService.listVehicles();
        if (res.success && res.data?.data) {
            // Map DefaultDocument[] to Vehicle[]
            const vehicles: Vehicle[] = res.data.data.map((doc: any) => ({
                $id: doc.$id,
                vehicleNumber: doc.vehicleNumber,
                vehicleType: doc.vehicleType,
                mileage: doc.mileage,
                labels: doc.labels || [],
            }));
            setVehicles(vehicles);
        } else toast.error(res.error || "Failed to load vehicles");
    };

    const loadFiles = async () => {
        const res = await fileService.listFiles();
        if (res.success && res.data) setFiles(res.data as FileMeta[]);
        else toast.error(res.error || "Failed to load files");
    };

    // Upload files
    const handleUpload = async () => {
        if (!selectedFiles || !selectedUser || !selectedVehicle) {
            toast.error("Please select a user, vehicle, and files.");
            return;
        }
        setIsUploading(true);
        try {
            for (const file of Array.from(selectedFiles)) {
                const res = await fileService.uploadFile(file, selectedUser, selectedVehicle);
                if (!res.success) toast.error(res.error);
                else toast.success(`${file.name} uploaded successfully`);
            }
            await loadFiles();
            setSelectedFiles(null);
            setSelectedUser(null);
            setSelectedVehicle(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } finally {
            setIsUploading(false);
        }
    };

    // Delete file
    const handleDelete = async () => {
        if (!fileToDelete) return;
        const res = await fileService.deleteFile(fileToDelete.fileId);
        if (res.success) {
            toast.success("File deleted successfully.");
            await loadFiles();
        } else {
            toast.error(res.error || "Failed to delete file");
        }
        setDeleteDialogOpen(false);
        setFileToDelete(null);
    };

    // Filtered files
    const filteredFiles = useMemo(() => {
        return files.filter(f => {
            const matchesFilename = f.originalName.toLowerCase().includes(filters.filename.toLowerCase());
            const matchesUsers = filterUsers.length ? filterUsers.includes(f.userId) : true;
            const matchesVehicles = filterVehicles.length ? filterVehicles.includes(f.vehicleNumber || "") : true;
            return matchesFilename && matchesUsers && matchesVehicles;
        });
    }, [files, filters, filterUsers, filterVehicles]);

    // Table columns
    const columns = [
        { header: "File Name", accessorKey: "originalName" },
        { header: "User", accessorKey: "username" },
        { header: "Email", accessorKey: "email" },
        { header: "Size", accessorKey: "size" },
        { header: "Mileage", accessorKey: "mileage" },
        { header: "Vehicle Number", accessorKey: "vehicleNumber" },
        { header: "Vehicle Type", accessorKey: "vehicleType" },
        { header: "Labels", accessorKey: "labels", cell: ({ row }: any) => (row.original.labels || []).join(", ") },
        { header: "Uploaded At", accessorKey: "$createdAt", cell: ({ row }: any) => new Date(row.original.$createdAt).toLocaleString() },
        {
            header: "Actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(row.original.downloadUrl, "_blank")}>
                        Download
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { setFileToDelete(row.original); setDeleteDialogOpen(true); }}>
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
                    <div className="w-full h-44 flex items-center justify-between px-6"
                        style={{ backgroundImage: "linear-gradient(90deg, rgba(2,6,23,0.88), rgba(2,6,23,0.6)), url('https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center" }}>
                        <div>
                            <h1 className="text-3xl font-semibold text-white">File Manager</h1>
                            <p className="text-sm text-slate-200 mt-1">Upload government IDs and manage them securely.</p>
                        </div>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white border border-slate-200 rounded-md px-6 py-5 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                        {/* User Dropdown with Search */}
                        <Select value={selectedUser?.$id || ""} onValueChange={id => setSelectedUser(users.find(u => u.$id === id) || null)}>
                            <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Select user" /></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                                <div className="px-2 py-1"><Input placeholder="Search user..." value={searchUserUpload} onChange={e => setSearchUserUpload(e.target.value)} /></div>
                                {users.filter(u => u.username.toLowerCase().includes(searchUserUpload.toLowerCase()) || u.email.toLowerCase().includes(searchUserUpload.toLowerCase()))
                                    .map(u => <SelectItem key={u.$id} value={u.$id}>{u.username} ({u.email})</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Vehicle Dropdown with Search */}
                        <Select value={selectedVehicle?.$id || ""} onValueChange={id => setSelectedVehicle(vehicles.find(v => v.$id === id) || null)}>
                            <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                                <div className="px-2 py-1"><Input placeholder="Search vehicle..." value={searchVehicleUpload} onChange={e => setSearchVehicleUpload(e.target.value)} /></div>
                                {vehicles.filter(v => v.vehicleNumber.toLowerCase().includes(searchVehicleUpload.toLowerCase()))
                                    .map(v => <SelectItem key={v.$id} value={v.$id}>{v.vehicleNumber} ({v.vehicleType})</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* File input */}
                        <div className="border border-slate-300 rounded-md px-3 py-2 flex items-center min-w-[180px]">
                            <input ref={fileInputRef} type="file" multiple onChange={e => setSelectedFiles(e.target.files)} disabled={!selectedUser || !selectedVehicle} className="text-sm w-full cursor-pointer" />
                        </div>
                        <span className="text-xs text-slate-400 ml-2 hidden sm:inline">Max 1MB • JPEG/PNG/PDF</span>
                        <Button onClick={handleUpload} disabled={isUploading} className="ml-auto bg-sky-600 text-white hover:bg-sky-700">{isUploading ? "Uploading..." : "Upload"}</Button>
                    </div>

                    {/* Filters Section */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 items-center">
                        <Input placeholder="Filter by filename" value={filters.filename} onChange={e => setFilters({ ...filters, filename: e.target.value })} />

                        {/* Multi-user filter */}
                        <Select value={filterUsers.join(",")} onValueChange={val => setFilterUsers(val ? val.split(",") : [])}>
                            <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Filter users" /></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                                <div className="px-2 py-1 flex justify-between gap-2">
                                    <Input placeholder="Search user..." value={searchFilterUsers} onChange={e => setSearchFilterUsers(e.target.value)} className="flex-1" />
                                    <Button size="sm" onClick={() => setFilterUsers([])}>Clear</Button>
                                </div>
                                {users.filter(u => u.username.toLowerCase().includes(searchFilterUsers.toLowerCase()) || u.email.toLowerCase().includes(searchFilterUsers.toLowerCase()))
                                    .map(u => <SelectItem key={u.$id} value={u.$id}>{u.username} ({u.email})</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Multi-vehicle filter */}
                        <Select value={filterVehicles.join(",")} onValueChange={val => setFilterVehicles(val ? val.split(",") : [])}>
                            <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Filter vehicles" /></SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                                <div className="px-2 py-1 flex justify-between gap-2">
                                    <Input placeholder="Search vehicle..." value={searchFilterVehicles} onChange={e => setSearchFilterVehicles(e.target.value)} className="flex-1" />
                                    <Button size="sm" onClick={() => setFilterVehicles([])}>Clear</Button>
                                </div>
                                {vehicles.filter(v => v.vehicleNumber.toLowerCase().includes(searchFilterVehicles.toLowerCase()))
                                    .map(v => <SelectItem key={v.$id} value={v.vehicleNumber}>{v.vehicleNumber} ({v.vehicleType})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Files Table */}
                <div className="mt-6 bg-white border border-slate-200 rounded-md px-6 py-4 overflow-x-auto">
                    <div className="text-sm text-slate-700 mb-3">Showing {filteredFiles.length} result{filteredFiles.length !== 1 ? "s" : ""}</div>
                    <div className="min-w-[1200px]"><DataTable columns={columns} data={filteredFiles} /></div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <div>Are you sure you want to delete this file?</div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
