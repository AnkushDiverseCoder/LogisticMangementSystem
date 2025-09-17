"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";

import authService from "@/lib/authService";
import vehicleService, { Vehicle } from "@/lib/vehicleService";
import dailyEntryFormService from "@/lib/dailyEntryFormService";
import { cn } from "@/lib/utils";

// ✅ shadcn toast
import { toast } from "sonner";
import employeeGlobalService from "@/lib/employeeGlobalService";

type Employee = {
    $id?: string;
    username: string;
    email: string;
};

type FormData = {
    meterReading: number | null;
    fuelQuantity: number | null;
    mileage: number | null;
    totalDistance: number | null;
    reqTripCount: number | null;
    createdAt: string;
    userEmail: string;
    username: string;
    vehicleNumber: string;
    vehicleType: string;
};

const initialFormData: FormData = {
    meterReading: null,
    fuelQuantity: null,
    mileage: null,
    totalDistance: null,
    reqTripCount: null,
    createdAt: new Date().toISOString(),
    userEmail: "",
    username: "",
    vehicleNumber: "",
    vehicleType: "",
};

export default function DailyEntryPage() {

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
        null
    );
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Dropdown control
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [vehicleOpen, setVehicleOpen] = useState(false);

    // Fetch employees & vehicles
    useEffect(() => {
        const fetchData = async () => {
            const usersRes = await authService.fetchAllUsers();
            if (usersRes?.success && Array.isArray(usersRes.data)) {
                const employeesFiltered = usersRes.data.filter((u: any) =>
                    u.labels?.includes("employee")
                );
                const uniqueEmployees = Array.from(
                    new Map(
                        employeesFiltered.map((u: any) => [u.email, u])
                    ).values()
                );
                setEmployees(
                    uniqueEmployees.map((u: any) => ({
                        $id: u.$id,
                        username: u.username,
                        email: u.email,
                    }))
                );
            }

            const vehiclesRes = await vehicleService.listVehicles();
            if (vehiclesRes.success && Array.isArray(vehiclesRes.data?.data)) {
                setVehicles(
                    vehiclesRes.data.data.map((v: any) => ({
                        $id: v.$id,
                        vehicleNumber: v.vehicleNumber,
                        vehicleType: v.vehicleType,
                        mileage: v.mileage,
                        // add other Vehicle properties if needed
                    }))
                );
            }
        };

        fetchData();
    }, []);

    // Handle vehicle selection → auto-fill mileage & type
    const handleVehicleSelect = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData((prev) => ({
            ...prev,
            vehicleNumber: vehicle.vehicleNumber,
            vehicleType: vehicle.vehicleType,
            mileage: vehicle.mileage ?? null,
        }));
        setVehicleOpen(false); // ✅ close dropdown
    };

    // Handle employee selection
    const handleEmployeeSelect = (emp: Employee) => {
        setSelectedEmployee(emp);
        setFormData((prev) => ({
            ...prev,
            userEmail: emp.email,
            username: emp.username,
        }));
        setEmployeeOpen(false); // ✅ close dropdown
    };

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            let updated: FormData = {
                ...prev,
                [name]: value === "" ? null : Number(value),
            } as FormData;

            // ✅ Auto calculate totalDistance if fuelQuantity entered
            if (name === "fuelQuantity") {
                const fuel = Number(value) || 0;
                const mileage = updated.mileage ?? 0;
                updated.totalDistance = fuel * mileage;
            }

            return updated;
        });
    };

    const handleSubmit = async () => {
        if (!selectedEmployee || !selectedVehicle) {
            toast.error("Please select both employee and vehicle.");
            return;
        }

        // Parse numbers and calculate totalDistance
        const meterReading = parseFloat(formData.meterReading?.toString() || "0");
        const fuelQuantity = parseFloat(formData.fuelQuantity?.toString() || "0");
        const mileageValue = parseFloat(formData.mileage?.toString() || "0");
        const totalDistance = fuelQuantity * mileageValue;

        const payload = {
            ...formData,
            meterReading,
            fuelQuantity,
            mileage: mileageValue,
            totalDistance,
            reqTripCount: parseInt(formData.reqTripCount?.toString() || "0"),
            userEmail: selectedEmployee.email,
            username: selectedEmployee.username,
            vehicleNumber: selectedVehicle.vehicleNumber,
            vehicleType: selectedVehicle.vehicleType,
            createdAt: new Date().toISOString(),
        };

        try {
            // 1️⃣ First: create or update global entry
            const globalRes = await employeeGlobalService.createOrUpdateEntry(
                formData,
                selectedEmployee,
                mileageValue
            );

            if (globalRes.error) {
                toast.error(
                    "Failed to update global tracking: " + globalRes.error
                );
                return; // ❌ Stop here if global entry fails
            }

            // 2️⃣ Then: create daily entry
            const res = await dailyEntryFormService.createDailyEntry(payload);

            if (res.error) {
                toast.error(res.error.message || "Error creating daily entry");
                return;
            }

            toast.success("Diesel entry and global tracking updated successfully!");

            // 3️⃣ Reset form
            setFormData({ ...initialFormData, createdAt: new Date().toISOString() });
            setSelectedEmployee(null);
            setSelectedVehicle(null);
        } catch (err: any) {
            toast.error("Unexpected error: " + err.message);
        }
    };



    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Create Daily Entry</h1>

            {/* Employee Dropdown */}
            <div>
                <label className="block mb-2 text-sm font-medium">Employee</label>
                <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                        >
                            {selectedEmployee
                                ? selectedEmployee.username
                                : "Select employee"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Search employee..." />
                            <CommandEmpty>No employee found.</CommandEmpty>
                            <CommandGroup>
                                {employees.map((emp, idx) => (
                                    <CommandItem
                                        key={emp.$id ?? `${emp.email}-${idx}`}
                                        onSelect={() => handleEmployeeSelect(emp)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedEmployee?.email === emp.email
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {emp.username} ({emp.email})
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Vehicle Dropdown */}
            <div>
                <label className="block mb-2 text-sm font-medium">Vehicle</label>
                <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                        >
                            {selectedVehicle
                                ? selectedVehicle.vehicleNumber
                                : "Select vehicle"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Search vehicle..." />
                            <CommandEmpty>No vehicle found.</CommandEmpty>
                            <CommandGroup>
                                {vehicles.map((veh, idx) => (
                                    <CommandItem
                                        key={veh.$id ?? `${veh.vehicleNumber}-${idx}`}
                                        onSelect={() => handleVehicleSelect(veh)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedVehicle?.$id === veh.$id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        {veh.vehicleNumber}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Inputs */}
            <Input
                type="text"
                name="vehicleType"
                placeholder="Vehicle Type"
                value={formData.vehicleType}
                readOnly
            />
            <Input
                type="number"
                name="mileage"
                placeholder="Mileage"
                value={formData.mileage ?? ""}
                onChange={handleChange}
            />
            <Input
                type="number"
                name="meterReading"
                placeholder="Meter Reading"
                value={formData.meterReading ?? ""}
                onChange={handleChange}
            />
            <Input
                type="number"
                name="fuelQuantity"
                placeholder="Fuel Quantity"
                value={formData.fuelQuantity ?? ""}
                onChange={handleChange}
            />
            <Input
                type="number"
                name="totalDistance"
                placeholder="Total Distance"
                value={formData.totalDistance ?? ""}
                readOnly
            />
            <Input
                type="number"
                name="reqTripCount"
                placeholder="Required Trip Count"
                value={formData.reqTripCount ?? ""}
                onChange={handleChange}
            />

            <Button className="w-full" onClick={handleSubmit}>
                Submit Entry
            </Button>
        </div>
    );
}
