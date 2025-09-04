"use client";

import React, { useEffect, useState, useMemo } from "react";
import tripService from "@/lib/tripService";
import dailyEntryFormService from "@/lib/dailyEntryFormService";
import authService from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface User {
    email: string;
    name?: string;
    id?: string;
}

type ReportType = "trips" | "dailyEntries";

const ReportDownload: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState<ReportType>("trips");

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
            const res = await authService.fetchAllUsers();
            if (res.data) {
                const mappedUsers: User[] = res.data
                    .map((doc: any) => doc.email ? { email: doc.email, name: doc.name || doc.email } : null)
                    .filter(Boolean) as User[];
                setUsers(mappedUsers);
            }
        };
        fetchUsers();
    }, []);

    const toggleUserSelection = (email: string) => {
        setSelectedUsers(prev =>
            prev.includes(email) ? prev.filter(u => u !== email) : [...prev, email]
        );
    };

    const selectAllUsers = () => setSelectedUsers(users.map(u => u.email));
    const deselectAllUsers = () => setSelectedUsers([]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const term = searchTerm.toLowerCase();
        return users.filter(
            u => u.email.toLowerCase().includes(term) || u.name?.toLowerCase().includes(term)
        );
    }, [users, searchTerm]);

    // Generic CSV download
    const downloadCsv = (data: any[], filename: string) => {
        if (!data.length) return alert("No data found");

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(","),
            ...data.map(row => headers.map(field => `"${row[field] ?? ""}"`).join(",")),
        ];

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            let res;
            if (reportType === "trips") {
                res = await tripService.fetchTripsForCsv(
                    selectedUsers.length ? selectedUsers : undefined,
                    startDate || undefined,
                    endDate || undefined
                );
            } else {
                res = await dailyEntryFormService.fetchEntriesForCsv(
                    selectedUsers.length ? selectedUsers : undefined,
                    startDate || undefined,
                    endDate || undefined
                );
            }

            if (res.error) {
                alert(res.error);
            } else {
                downloadCsv(res.data ?? [], reportType);
            }
        } catch (err: any) {
            alert(err.message || "Error downloading CSV");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-center">
                {reportType === "trips" ? "Trips Report" : "Daily Entries Report"}
            </h1>

            {/* Report Type Toggle */}
            <div className="flex space-x-4 justify-center mb-4">
                <Button
                    variant={reportType === "trips" ? "default" : "outline"}
                    onClick={() => setReportType("trips")}
                >
                    Trips
                </Button>
                <Button
                    variant={reportType === "dailyEntries" ? "default" : "outline"}
                    onClick={() => setReportType("dailyEntries")}
                >
                    Daily Entries
                </Button>
            </div>

            {/* User Multi-Select */}
            <div className="space-y-2">
                <Label>Choose Users</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            {selectedUsers.length ? `${selectedUsers.length} selected` : "Select Users"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full sm:w-96 p-3">
                        <div className="flex flex-col space-y-2">
                            <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="flex justify-between">
                                <Button variant="secondary" size="sm" onClick={selectAllUsers}>
                                    Select All
                                </Button>
                                <Button variant="secondary" size="sm" onClick={deselectAllUsers}>
                                    Deselect All
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="mt-2 h-64 border rounded-md p-2">
                            {filteredUsers.length ? (
                                filteredUsers.map((user, idx) => (
                                    <div key={`${user.email}-${idx}`} className="flex items-center space-x-2 py-1">
                                        <Checkbox
                                            checked={selectedUsers.includes(user.email)}
                                            onCheckedChange={() => toggleUserSelection(user.email)}
                                        />
                                        <span className="truncate">{user.name || user.email}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No users found</p>
                            )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="flex flex-col space-y-1">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>

            {/* Download Button */}
            <div className="flex justify-center">
                <Button onClick={handleDownload} disabled={loading} className="w-full sm:w-64">
                    {loading ? "Generating CSV..." : "Download CSV"}
                </Button>
            </div>
        </div>
    );
};

export default ReportDownload;
