"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { toast } from "sonner";
import fileService from "@/lib/fileService";
import authService from "@/lib/authService";

type User = {
    $id: string;
    username: string;
    email: string;
};

export default function FileManagerPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchUser, setSearchUser] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [filters, setFilters] = useState({
        filename: "",
        email: "",
        startDate: "",
        endDate: "",
    });

    // Fetch all users and files on mount
    useEffect(() => {
        loadUsers();
        loadFiles();
    }, []);

    const loadUsers = async () => {
        const res = await authService.fetchAllUsers();
        if (res.success) setUsers(res.data || []);
        else toast.error(res.error);
    };

    const loadFiles = async () => {
        const res = await fileService.listFiles();
        console.log(res);
        if (res.success) setFiles(res.data || []);
        else toast.error(res.error);
    };

    // Filtered files for live filtering
    const filteredFiles = useMemo(() => {
        return files.filter((f) => {
            const matchesUser = selectedUser ? f.userId === selectedUser.$id : true;
            const matchesFilename =
                (f.originalName || "")
                    .toString()
                    .toLowerCase()
                    .includes(filters.filename.toLowerCase());
            const matchesEmail =
                (f.email || "").toString().toLowerCase().includes(filters.email.toLowerCase());
            const created = f.$createdAt ? new Date(f.$createdAt).getTime() : 0;
            const matchesStartDate = filters.startDate
                ? created >= new Date(filters.startDate).getTime()
                : true;
            const matchesEndDate = filters.endDate
                ? created <= new Date(filters.endDate).getTime()
                : true;
            return matchesUser && matchesFilename && matchesEmail && matchesStartDate && matchesEndDate;
        });
    }, [files, selectedUser, filters]);

    const handleUpload = async () => {
        if (!selectedFiles || !selectedUser) {
            toast.error("Please select a user and files.");
            return;
        }
        setIsUploading(true);
        try {
            for (const file of Array.from(selectedFiles)) {
                const res = await fileService.uploadFile(file, selectedUser);
                if (!res.success) toast.error(res.error);
                else toast.success(`${file.name} uploaded successfully`);
            }
            await loadFiles();
        } finally {
            setIsUploading(false);
            setSelectedFiles(null);
            setSelectedUser(null);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!fileId) {
            toast.error("File ID missing.");
            return;
        }

        const confirmDelete = window.confirm("Are you sure you want to delete this file?");
        if (!confirmDelete) return;
        const res = await fileService.deleteFile(fileId);
        if (res.success) {
            toast.success("File deleted successfully.");
            await loadFiles(); // refresh list
        } else {
            toast.error(res.error || "Failed to delete file.");
        }
    };

    const columns = [
        { header: "File Name", accessorKey: "originalName" },
        { header: "User", accessorKey: "username" },
        { header: "Email", accessorKey: "email" },
        {
            header: "Uploaded At",
            accessorKey: "createdAt",
            cell: ({ row }: any) => (row.original.$createdAt ? new Date(row.original.$createdAt).toLocaleString() : "-"),
        },
        {
            header: "Actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(row.original.downloadUrl, "_blank")}
                    >
                        Download
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(row.original.fileId)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    const filteredUsers = users.filter(
        (u) =>
            u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
            u.email.toLowerCase().includes(searchUser.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-8 px-6">
                {/* Public image banner (flat, no shadows) */}
                <div className="rounded-md overflow-hidden mb-6">
                    <div
                        className="w-full h-44 flex items-center justify-between px-6"
                        style={{
                            backgroundImage:
                                "linear-gradient(90deg, rgba(2,6,23,0.88), rgba(2,6,23,0.6)), url('https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1600&q=80')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <div>
                            <h1 className="text-3xl font-semibold text-white">File Manager</h1>
                            <p className="text-sm text-slate-200 mt-1">
                                Upload government IDs and manage them securely.
                            </p>
                        </div>
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/10">
                            {/* subtle icon circle */}
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M12 3v18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M6 9h12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Content container (flat) */}
                <div className="bg-white border border-slate-200 rounded-md">
                    <div className="px-6 py-5">
                        {/* Single-line upload row (wraps on small screens) */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                            {/* user search + select inline */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Input
                                    placeholder="Search users..."
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    className="min-w-0"
                                />
                                <Select
                                    onValueChange={(id) =>
                                        setSelectedUser(users.find((u) => u.$id === id) || null)
                                    }
                                    value={selectedUser?.$id || ""}
                                >
                                    <SelectTrigger className="min-w-[200px]">
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredUsers.map((u) => (
                                            <SelectItem key={u.$id} value={u.$id}>
                                                {u.username} ({u.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* file input - styled container */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-slate-600 mr-2 hidden md:block">Files</label>
                                <div className="border border-slate-300 rounded-md px-3 py-2 flex items-center min-w-[180px]">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => setSelectedFiles(e.target.files)}
                                        className="text-sm w-full cursor-pointer"
                                    />
                                </div>
                                <span className="text-xs text-slate-400 ml-2 hidden sm:inline">Max 1MB • JPEG/PNG/PDF</span>
                            </div>

                            {/* actions */}
                            <div className="ml-auto flex items-center gap-3">
                                <Button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="bg-sky-600 text-white hover:bg-sky-700"
                                >
                                    {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                            </div>
                        </div>

                        {/* Filters row */}
                        <div className="mt-6 border-t border-slate-100 pt-4">
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                                <Input
                                    placeholder="Filter by filename"
                                    value={filters.filename}
                                    onChange={(e) => setFilters({ ...filters, filename: e.target.value })}
                                    className="flex-1 min-w-[160px]"
                                />
                                <Input
                                    placeholder="Filter by email"
                                    value={filters.email}
                                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                    className="flex-1 min-w-[160px]"
                                />
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className="min-w-[140px]"
                                />
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className="min-w-[140px]"
                                />
                                <div className="ml-auto flex gap-2">
                                    <Button variant="outline" onClick={() => setFilters({ filename: "", email: "", startDate: "", endDate: "" })}>
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table area */}
                <div className="mt-6 bg-white border border-slate-200 rounded-md">
                    <div className="px-6 py-4">
                        <div className="text-sm text-slate-700 mb-3">Showing {filteredFiles.length} result{filteredFiles.length !== 1 ? "s" : ""}</div>
                        <div className="overflow-x-auto">
                            <DataTable columns={columns} data={filteredFiles} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
