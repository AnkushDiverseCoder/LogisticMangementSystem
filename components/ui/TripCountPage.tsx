"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

import tripService from "@/lib/tripService";
import authService from "@/lib/authService";

interface User {
    email: string;
    displayName: string;
}

interface TripData {
    count: number;
    reqTripCount?: number;
}

export default function TripCountPage() {
    const [tripCounts, setTripCounts] = useState<Record<string, TripData>>({});
    const [users, setUsers] = useState<User[]>([]);
    const [tripSearch, setTripSearch] = useState("");
    const [tripDate, setTripDate] = useState<Date | null>(null);
    const [customDateEnabled, setCustomDateEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"today" | "month">("today");

    const fetchTripData = async (mode: "today" | "month", date?: Date | null) => {
        setLoading(true);
        try {
            const userRes = (await authService.fetchAllUsers()) as { data?: User[] };
            const tripRes = (await tripService.fetchUserTripCounts(
                mode,
                date ?? undefined
            )) as { data?: Record<string, TripData> };

            const uniqueUsers = Array.from(
                new Map(userRes.data?.map((u) => [u.email, u]) ?? []).values()
            );

            setUsers(uniqueUsers);
            setTripCounts(tripRes.data ?? {});
        } catch (err) {
            console.error(err);
            setTripCounts({});
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTripData("today");
    }, []);

    // Merge all users with trip data
    const mergedData = users.map((user) => {
        const tripInfo = tripCounts[user.email] ?? { count: 0, reqTripCount: 0 };
        return {
            displayName: user.displayName,
            email: user.email,
            count: tripInfo.count,
            reqTripCount: tripInfo.reqTripCount ?? 0,
        };
    });

    const filteredData = mergedData
        .filter((row) =>
            row.displayName.toLowerCase().includes(tripSearch.toLowerCase())
        )
        .sort((a, b) => b.count - a.count);

    const exportToCSV = (filtered: boolean) => {
        const exportData = (filtered
            ? filteredData.filter((u) => u.count >= 5)
            : mergedData
        ).map((row) => ({
            Name: row.displayName,
            Email: row.email,
            Trips: row.count,
            Required: row.reqTripCount,
        }));

        if (exportData.length === 0) {
            alert("No users to export.");
            return;
        }

        const header = Object.keys(exportData[0]).join(",");
        const rows = exportData.map((row) => Object.values(row).join(",")).join("\n");
        const csv = `${header}\n${rows}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
            "download",
            `${activeTab}_trip_report_${tripDate ? format(tripDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
            }.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        {
            accessorKey: "displayName",
            header: "Employee",
        },
        {
            accessorKey: "count",
            header: "Completed / Required",
            cell: ({ row }: any) =>
                `${row.original.count} / ${row.original.reqTripCount}`,
        },
    ];

    return (
        <div className="container mx-auto py-10 space-y-6">
            <Tabs
                value={activeTab}
                onValueChange={(val) => {
                    setActiveTab(val as "today" | "month");
                    setTripDate(null);
                    fetchTripData(val as "today" | "month");
                }}
            >
                <TabsList>
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="month">Monthly</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
                <label className="text-base font-semibold">
                    Enable Custom {activeTab === "today" ? "Date" : "Month"}:
                </label>
                <input
                    type="checkbox"
                    checked={customDateEnabled}
                    onChange={(e) => {
                        setCustomDateEnabled(e.target.checked);
                        if (!e.target.checked) {
                            setTripDate(null);
                            fetchTripData(activeTab);
                        }
                    }}
                    className="h-5 w-5"
                />
                {customDateEnabled && (
                    <input
                        type="date"
                        value={tripDate ? format(tripDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                            const val = e.target.value ? new Date(e.target.value) : null;
                            setTripDate(val);
                            fetchTripData(activeTab, val);
                        }}
                        className="border rounded px-2 py-1"
                    />
                )}
            </div>

            <Input
                placeholder="Search by name..."
                value={tripSearch}
                onChange={(e) => setTripSearch(e.target.value)}
            />

            <div className="flex gap-2">
                {activeTab === "today" && (
                    <Button onClick={() => exportToCSV(true)}>Export ≥5 Trips</Button>
                )}
                <Button onClick={() => exportToCSV(false)}>Export All</Button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : filteredData.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No trips found.</div>
            ) : (
                <DataTable columns={columns} data={filteredData} />
            )}
        </div>
    );
}
