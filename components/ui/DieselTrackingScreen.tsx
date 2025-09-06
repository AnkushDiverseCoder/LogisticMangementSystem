"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";

import employeeGlobalService from "@/lib/employeeGlobalService";
import authService from "@/lib/authService";
import { Query } from "appwrite";

interface User {
    email: string;
    displayName: string;
}

interface DieselEntry {
    $id: string;
    userEmail: string;
    createdAt: string;
    vehicleNumber: string;
    previousMeterReading: number;
    fuelFilled: number;
    meterReading: number;
    remainingDistance: number;
}

export default function DieselTrackingPage() {
    const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
    const [users, setUsers] = useState<User[]>([]);
    const [allEntries, setAllEntries] = useState<DieselEntry[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(true);

    const getDisplayName = (email: string) =>
        users.find((u) => u.email.toLowerCase() === email.toLowerCase())
            ?.displayName || "Unknown";

    const fetchMonthlyEntries = useCallback(async () => {
        try {
            const res = await employeeGlobalService.listEntries([]);
            let filtered: DieselEntry[] = res.data.data;

            if (startDate && endDate) {
                filtered = filtered.filter((entry) => {
                    const d = new Date(entry.createdAt);
                    return d >= new Date(startDate) && d <= new Date(endDate);
                });
            }

            if (vehicleFilter) {
                filtered = filtered.filter((entry) =>
                    entry.vehicleNumber
                        ?.toLowerCase()
                        .includes(vehicleFilter.toLowerCase())
                );
            }

            setAllEntries(
                filtered.sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
            );
        } catch (err) {
            console.error("Failed to load monthly data", err);
        }
    }, [startDate, endDate, vehicleFilter]);

    const fetchUsersAndData = useCallback(async () => {
        try {
            const res = (await authService.fetchAllUsers()) as { data: User[] };
            const unique = Array.from(new Map(res.data.map((u) => [u.email, u])).values());
            setUsers(unique);

            if (activeTab === "daily") {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

                const res = await employeeGlobalService.listEntries([
                    Query.greaterThanEqual('createdAt', startOfDay),
                    Query.lessThanEqual('createdAt', endOfDay),
                ]);

                const latestEntries: Record<string, DieselEntry> = {};
                for (const entry of res.data.data) {
                    const email = entry.userEmail.toLowerCase();
                    if (
                        !latestEntries[email] ||
                        new Date(entry.createdAt) >
                        new Date(latestEntries[email].createdAt)
                    ) {
                        latestEntries[email] = entry;
                    }
                }

                setAllEntries(Object.values(latestEntries));
            } else {
                fetchMonthlyEntries();
            }
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, fetchMonthlyEntries]);

    useEffect(() => {
        fetchUsersAndData();
    }, [activeTab, fetchUsersAndData]);

    const filteredEntries = allEntries.filter((entry) => {
        const user = users.find(
            (u) => u.email.toLowerCase() === entry.userEmail.toLowerCase()
        );
        const matchesName = employeeSearch
            ? user?.displayName
                ?.toLowerCase()
                .includes(employeeSearch.toLowerCase())
            : true;
        return matchesName;
    });

    const exportToCSV = () => {
        if (!filteredEntries.length) {
            alert("No entries to export.");
            return;
        }

        const exportData = filteredEntries.map((entry) => ({
            Date: new Date(entry.createdAt).toLocaleDateString("en-GB"),
            "Vehicle No": entry.vehicleNumber,
            "Prev KM": entry.previousMeterReading,
            User: getDisplayName(entry.userEmail),
            Diesel: entry.fuelFilled,
            Meter: entry.meterReading,
            Remaining: entry.remainingDistance,
        }));

        const header = Object.keys(exportData[0]).join(",");
        const rows = exportData.map((row) => Object.values(row).join(",")).join("\n");
        const csv = `${header}\n${rows}`;

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
            "download",
            `${activeTab}_diesel_export_${Date.now()}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        {
            accessorKey: "user",
            header: "User",
            cell: ({ row }: any) => getDisplayName(row.original.userEmail),
        },
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ row }: any) =>
                new Date(row.original.createdAt).toLocaleDateString(),
        },
        { accessorKey: "vehicleNumber", header: "Vehicle No" },
        { accessorKey: "previousMeterReading", header: "Prev KM" },
        { accessorKey: "fuelFilled", header: "Diesel" },
        { accessorKey: "meterReading", header: "Meter" },
        {
            accessorKey: "remainingDistance",
            header: "Remaining",
            cell: ({ row }: any) => (
                <span
                    className={
                        row.original.remainingDistance < 30
                            ? "text-red-500 font-bold"
                            : "text-green-600 font-bold"
                    }
                >
                    {row.original.remainingDistance}
                </span>
            ),
        },
    ];

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "daily" | "monthly")}
            >
                <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <Input
                placeholder="Search by employee name"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
            />

            {activeTab === "monthly" && (
                <div className="space-y-3">
                    <Input
                        placeholder="Filter by vehicle number"
                        value={vehicleFilter}
                        onChange={(e) => setVehicleFilter(e.target.value)}
                    />
                    <div className="flex gap-4">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-48"
                        />
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-48"
                        />
                        <Button onClick={fetchMonthlyEntries}>Filter Monthly Data</Button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No entries found.</div>
            ) : (
                <DataTable columns={columns} data={filteredEntries} />
            )}

            {/* Export */}
            <Button onClick={exportToCSV}>
                Export {activeTab === "daily" ? "Daily" : "Monthly"} Report
            </Button>
        </div>
    );
}
