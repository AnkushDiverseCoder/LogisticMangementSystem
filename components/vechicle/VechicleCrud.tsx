"use client";

import React, { useEffect, useState, useMemo } from "react";
import vehicleService from "@/lib/vehicleService";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Vehicle = {
  $id: string;
  vehicleNumber: string;
  vehicleType: string;
  mileage: number;
  labels: string;
  $createdAt?: string;
  $updatedAt?: string;
};

export default function VehicleCrud() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState(""); // Vehicle type filter
  const [labelFilter, setLabelFilter] = useState(""); // Label filter
  const [editOpen, setEditOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Partial<Vehicle>>({});
  const [isNew, setIsNew] = useState(false);

  // ==============================
  // Fetch vehicles
  // ==============================
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleService.listVehicles();
      console.log(res);
      if (res.success && Array.isArray(res.data?.data)) {
        setVehicles(res.data?.data); // Appwrite style
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error(err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ==============================
  // Delete vehicle
  // ==============================
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    const res = await vehicleService.deleteVehicle(id);
    if (res.success) fetchVehicles();
    else alert(res.error);
  };

  // ==============================
  // Open dialog
  // ==============================
  const openDialog = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditVehicle(vehicle);
      setIsNew(false);
    } else {
      setEditVehicle({ mileage: 0 });
      setIsNew(true);
    }
    setEditOpen(true);
  };

  // ==============================
  // Save vehicle
  // ==============================
  const handleSave = async () => {
    let res;
    if (isNew) res = await vehicleService.createVehicle(editVehicle);
    else if (editVehicle.$id) res = await vehicleService.updateVehicle(editVehicle.$id, editVehicle);

    if (res?.success) {
      setEditOpen(false);
      fetchVehicles();
    } else {
      alert(res?.error || "Operation failed");
    }
  };

  // ==============================
  // CSV Export
  // ==============================
  const exportCSV = () => {
    if (!vehicles.length) return;

    const filtered = filteredVehicles;

    const header = ["Vehicle Number", "Vehicle Type", "Mileage", "Labels", "Created At"];
    const rows = filtered.map((v) => [
      v.vehicleNumber ?? "",
      v.vehicleType ?? "",
      v.mileage ?? 0,
      v.labels ?? "",
      v.$createdAt ?? "",
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "vehicles.csv");
    link.click();
  };

  // ==============================
  // Unique Vehicle Types & Labels
  // ==============================
  const vehicleTypes = useMemo(() => Array.from(new Set(vehicles.map((v) => v.vehicleType))), [vehicles]);
  const labels = useMemo(() => Array.from(new Set(vehicles.map((v) => v.labels).filter(Boolean))), [vehicles]);

  // ==============================
  // Filtered Vehicles
  // ==============================
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch = [v.vehicleNumber, v.vehicleType, v.labels].some((val) =>
        val?.toLowerCase().includes(search.toLowerCase())
      );
      const matchesType = groupFilter ? v.vehicleType === groupFilter : true;
      const matchesLabel = labelFilter ? v.labels === labelFilter : true;
      return matchesSearch && matchesType && matchesLabel;
    });
  }, [vehicles, search, groupFilter, labelFilter]);

  // ==============================
  // DataTable Columns
  // ==============================
  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: "vehicleType",
      header: "Vehicle Type",
      cell: ({ row }) => <Badge variant="secondary">{row.original.vehicleType}</Badge>,
    },
    { accessorKey: "vehicleNumber", header: "Vehicle Number" },
    { accessorKey: "mileage", header: "Mileage" },
    { accessorKey: "labels", header: "Labels" },
    { accessorKey: "$createdAt", header: "Created At" },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openDialog(row.original)}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.$id)}>Delete</Button>
        </div>
      ),
    },
  ];

  // ==============================
  // Render
  // ==============================
  return (
    <div className="p-6 space-y-6">
      {/* Header: Search + Filters + Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search by vehicle, type, labels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Vehicle Type Filter */}
        <Select onValueChange={(val) => setGroupFilter(val === "all" ? "" : val)} value={groupFilter || "all"}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {vehicleTypes.map((type) => (
              <SelectItem key={type} value={type || ""}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Label Filter */}
        <Select onValueChange={(val) => setLabelFilter(val === "all" ? "" : val)} value={labelFilter || "all"}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {labels.map((label) => (
              <SelectItem key={label} value={label || ""}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => openDialog()} disabled={loading}>Add Vehicle</Button>
        <Button onClick={exportCSV} variant="outline">Export CSV</Button>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredVehicles} />

      {/* Add/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Vehicle" : "Edit Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                value={editVehicle.vehicleNumber ?? ""}
                onChange={(e) => setEditVehicle({ ...editVehicle, vehicleNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <Input
                id="vehicleType"
                value={editVehicle.vehicleType ?? ""}
                onChange={(e) => setEditVehicle({ ...editVehicle, vehicleType: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={editVehicle.mileage ?? 0}
                onChange={(e) => setEditVehicle({ ...editVehicle, mileage: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="labels">Labels</Label>
              <Input
                id="labels"
                value={editVehicle.labels ?? ""}
                onChange={(e) => setEditVehicle({ ...editVehicle, labels: e.target.value })}
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
