"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import advanceEntryService from "@/lib/advanceEntryService";
import authService from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Employee {
  $id: string;
  username: string;
  email: string;
  labels?: string[];
  oldAdvance?: number;
}

export default function AdvanceEntryForm() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [transactionType, setTransactionType] = useState<"addition" | "deduction">("addition");
  const [heading, setHeading] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  // Fetch employees
  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await authService.fetchAllUsers();
      if (error) return alert("Failed to fetch employees");
      const emps = data.filter((u: Employee) => u.labels?.includes("employee"));
      setEmployees(emps);
      setFilteredEmployees(emps);
    }
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!employeeSearch) return setFilteredEmployees(employees);
    const lower = employeeSearch.toLowerCase();
    setFilteredEmployees(
      employees.filter(
        (e) =>
          e.username?.toLowerCase().includes(lower) || e.email?.toLowerCase().includes(lower)
      )
    );
  }, [employeeSearch, employees]);

  // Auto-fill Old Advance amount if heading is "Old Advance"
  useEffect(() => {
    if (heading === "Old Advance" && selectedEmployee) {
      setAmount(String(selectedEmployee.oldAdvance || ""));
    }
  }, [heading, selectedEmployee]);

  const handleSubmit = async () => {
    if (!selectedEmployee || !heading || !amount || !date) return alert("Please fill all required fields");

    const oldAdv = heading === "Old Advance" ? selectedEmployee.oldAdvance || 0 : 0;
    const newAdv = { amount: parseFloat(amount), date };
    const deductions = transactionType === "deduction" ? { amount: parseFloat(amount) } : { amount: 0 };
    const totalAdvance = oldAdv + (transactionType === "addition" ? parseFloat(amount) : 0);
    const balanceDue = totalAdvance - (transactionType === "deduction" ? parseFloat(amount) : 0);

    const entryData = {
      userName: selectedEmployee.username,
      userEmail: selectedEmployee.email,
      oldAdvance: oldAdv,
      newAdvance: JSON.stringify(newAdv),
      deductions: JSON.stringify(deductions),
      totalAdvance,
      balanceDue,
      heading,
      remarks: remarks || null,
    };

    try {
      await advanceEntryService.createEntry(entryData);
      alert("Entry created successfully");

      // Reset form
      setSelectedEmployee(null);
      setTransactionType("addition");
      setHeading("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setAmount("");
      setRemarks("");
    } catch (error) {
      console.error(error);
      alert("Error: Failed to save entry");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      {/* Banner */}
      <div className="w-full max-w-3xl bg-slate-900 text-white rounded-lg p-8 mb-8 shadow-lg">
        <h1 className="text-4xl font-bold">Advance Entry</h1>
        <p className="mt-2 text-slate-300">Create or update employee advance entries</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* Employee Selection */}
        <div className="flex flex-col">
          <Label className="text-slate-900 font-semibold mb-2">Employee</Label>
          <Button variant="outline" className="text-left" onClick={() => setEmployeeModalOpen(true)}>
            {selectedEmployee?.username || "Select Employee"}
          </Button>
        </div>

        {/* Transaction Type */}
        <div className="flex flex-col">
          <Label className="text-slate-900 font-semibold mb-2">Transaction Type</Label>
          <Select value={transactionType} onValueChange={(v) => setTransactionType(v as "addition" | "deduction")}>
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="addition">Addition</SelectItem>
              <SelectItem value="deduction">Deduction</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Heading */}
        <div className="flex flex-col">
          <Label className="text-slate-900 font-semibold mb-2">Heading</Label>
          <div className="flex gap-2">
            <Input placeholder="Manual heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
            <Button variant="outline" onClick={() => setHeading("Old Advance")}>
              Old Advance
            </Button>
          </div>
        </div>

        {/* Date */}
        <div className="flex flex-col">
          <Label className="text-slate-900 font-semibold mb-2">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Amount */}
        <div className="flex flex-col">
          <Label className="text-slate-900 font-semibold mb-2">Amount</Label>
          <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        {/* Remarks */}
        <div className="flex flex-col">
          <Label className="text-slate-900 font-semibold mb-2">Remarks (optional)</Label>
          <Textarea placeholder="Enter remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>

        {/* Submit */}
        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-lg font-semibold" onClick={handleSubmit}>
          Submit
        </Button>
      </div>

      {/* Employee Modal */}
      <Dialog open={employeeModalOpen} onOpenChange={setEmployeeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Employee</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search employee"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.$id}
                className="p-3 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                onClick={() => {
                  setSelectedEmployee(emp);
                  setEmployeeModalOpen(false);
                }}
              >
                {emp.username} ({emp.email})
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmployeeModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
