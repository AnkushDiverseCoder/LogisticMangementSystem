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
        if (res.success) setUsers(res.data as User[]);
        else toast.error(res.error);
    };

    const loadFiles = async () => {
        const res = await fileService.listFiles();
        if (res.success) setFiles(res.data || []); // ensure array
        else toast.error(res.error);
    };


    // Filtered files for live filtering
    const filteredFiles = useMemo(() => {
        return files.filter((f) => {
            const matchesUser = selectedUser ? f.userId === selectedUser.$id : true;
            const matchesFilename = f.originalName.toLowerCase().includes(filters.filename.toLowerCase());
            const matchesEmail = f.email.toLowerCase().includes(filters.email.toLowerCase());
            const matchesStartDate = filters.startDate
                ? new Date(f.$createdAt).getTime() >= new Date(filters.startDate).getTime()
                : true;
            const matchesEndDate = filters.endDate
                ? new Date(f.$createdAt).getTime() <= new Date(filters.endDate).getTime()
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
        const res = await fileService.deleteFile(fileId);
        if (res.success) {
            toast.success("File deleted");
            await loadFiles();
        } else {
            toast.error(res.error);
        }
    };

    const columns = [
        { header: "File Name", accessorKey: "originalName" },
        { header: "User", accessorKey: "username" },
        { header: "Email", accessorKey: "email" },
        {
            header: "Uploaded At",
            accessorKey: "createdAt",
            cell: ({ row }: any) => new Date(row.original.$createdAt).toLocaleString(),
        },
        {
            header: "Actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
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
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">File Manager</h1>

            {/* Upload Section */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                    <Input
                        placeholder="Search users..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                    />
                    <Select
                        onValueChange={(id) =>
                            setSelectedUser(users.find((u) => u.$id === id) || null)
                        }
                        value={selectedUser?.$id || ""}
                    >
                        <SelectTrigger className="w-[250px]">
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

                <Input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="w-[300px]"
                />

                <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Upload"}
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mt-4">
                <Input
                    placeholder="Filter by filename"
                    value={filters.filename}
                    onChange={(e) => setFilters({ ...filters, filename: e.target.value })}
                />
                <Input
                    placeholder="Filter by email"
                    value={filters.email}
                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                />
                <Input
                    type="date"
                    placeholder="Start date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
                <Input
                    type="date"
                    placeholder="End date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
            </div>

            {/* File Table */}
            <DataTable columns={columns} data={filteredFiles} />
        </div>
    );
}
