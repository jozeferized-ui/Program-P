"use client";

import { useState, useEffect } from "react";
import { Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Phone, Mail, Briefcase, ShieldCheck, AlertCircle, Clock, Download } from "lucide-react";
import { Workbook } from "exceljs";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { EmployeePermissionsDialog } from "./EmployeePermissionsDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { createEmployee, updateEmployee, deleteEmployee } from "@/actions/employees";

interface EmployeesManagerProps {
    initialEmployees: Employee[];
}

export function EmployeesManager({ initialEmployees }: EmployeesManagerProps) {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
    const [selectedEmployeeForPermissions, setSelectedEmployeeForPermissions] = useState<Employee | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);

    useEffect(() => {
        setEmployees(initialEmployees);
    }, [initialEmployees]);

    const handlePermissionsClick = (employee: Employee) => {
        setSelectedEmployeeForPermissions(employee);
        setIsPermissionsDialogOpen(true);
    };

    const getEmployeePermissionsStatus = (employee: Employee) => {
        if (!employee.employeePermissions || employee.employeePermissions.length === 0) return null;

        const today = new Date();
        let hasExpired = false;
        let hasExpiringSoon = false;

        employee.employeePermissions.forEach(p => {
            if (p.expiryDate) {
                const days = differenceInDays(new Date(p.expiryDate), today);
                if (days < 0) hasExpired = true;
                else if (days < 30) hasExpiringSoon = true;
            }
        });

        return (
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                    {employee.employeePermissions.map(p => {
                        const isExpired = p.expiryDate && differenceInDays(new Date(p.expiryDate), today) < 0;
                        const isExpiringSoon = p.expiryDate && !isExpired && differenceInDays(new Date(p.expiryDate), today) < 30;

                        return (
                            <Badge
                                key={p.id}
                                variant="outline"
                                className={`
                                    text-[10px] px-1.5 py-0 
                                    ${isExpired ? "border-red-500 text-red-600 bg-red-50" :
                                        isExpiringSoon ? "border-yellow-500 text-yellow-600 bg-yellow-50" :
                                            "border-green-500 text-green-600 bg-green-50"}
                                `}
                            >
                                {p.name}
                            </Badge>
                        );
                    })}
                </div>
                <div className="flex items-center gap-1">
                    {hasExpired ? (
                        <Badge variant="destructive" className="text-[10px] h-5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Nieważne upr.
                        </Badge>
                    ) : hasExpiringSoon ? (
                        <Badge variant="outline" className="text-[10px] h-5 flex items-center gap-1 bg-yellow-500 border-none text-white">
                            <Clock className="w-3 h-3" /> Kończą się
                        </Badge>
                    ) : (
                        <Badge className="text-[10px] h-5 flex items-center gap-1 bg-green-600">
                            <ShieldCheck className="w-3 h-3" /> OK
                        </Badge>
                    )}
                </div>
            </div>
        );
    };

    const handleExportExcel = async () => {
        try {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Pracownicy');

            // 1. Collect all unique permission names
            const allPermissionNames = Array.from(new Set(
                employees.flatMap(emp => emp.employeePermissions?.map(p => p.name) || [])
            )).sort();

            // 2. Define static columns
            const columns: any[] = [
                { header: 'Imię', key: 'firstName', width: 15 },
                { header: 'Nazwisko', key: 'lastName', width: 20 },
                { header: 'Stanowisko', key: 'position', width: 20 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Telefon', key: 'phone', width: 15 },
                { header: 'Stawka (zł)', key: 'rate', width: 12 },
                { header: 'Status', key: 'status', width: 10 },
            ];

            // 3. Add dynamic columns for each permission type
            allPermissionNames.forEach(name => {
                columns.push({ header: `${name} (Numer)`, key: `${name}_num`, width: 20 });
                columns.push({ header: `${name} (Ważność)`, key: `${name}_date`, width: 15 });
            });

            worksheet.columns = columns;

            // Style header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // 4. Add data rows
            filteredEmployees.forEach(emp => {
                const rowData: any = {
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    position: emp.position,
                    email: emp.email,
                    phone: emp.phone,
                    rate: emp.rate,
                    status: emp.status === 'Active' ? 'Aktywny' : 'Nieaktywny',
                };

                // Fill permission columns
                allPermissionNames.forEach(name => {
                    const perm = emp.employeePermissions?.find(p => p.name === name);
                    if (perm) {
                        rowData[`${name}_num`] = perm.number || '—';
                        rowData[`${name}_date`] = perm.expiryDate
                            ? format(new Date(perm.expiryDate), 'dd.MM.yyyy')
                            : 'Bezterminowo';
                    } else {
                        rowData[`${name}_num`] = '—';
                        rowData[`${name}_date`] = '—';
                    }
                });

                worksheet.addRow(rowData);
            });

            // 5. Apply status highlighting (Red for expired, Green for valid)
            const today = new Date();
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                allPermissionNames.forEach((name, idx) => {
                    // Date columns start after the 7 static columns
                    // For each permission, we have [Num, Date]
                    // So column index for Date is 7 (static) + (idx * 2) + 2 (1-indexed, so +2 for second of pair)
                    const dateColIndex = 7 + (idx * 2) + 2;
                    const cell = row.getCell(dateColIndex);
                    const cellValue = cell.value?.toString();

                    if (cellValue && cellValue !== '—') {
                        if (cellValue === 'Bezterminowo') {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFC6EFCE' } // Green
                            };
                            cell.font = { color: { argb: 'FF006100' } };
                        } else {
                            try {
                                const parts = cellValue.split('.');
                                const expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                const isExpired = expiryDate < today;

                                if (isExpired) {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFFFC7CE' } // Red
                                    };
                                    cell.font = { color: { argb: 'FF9C0006' } };
                                } else {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFC6EFCE' } // Green
                                    };
                                    cell.font = { color: { argb: 'FF006100' } };
                                }
                            } catch (e) {
                                // Fallback
                            }
                        }
                    }
                });
            });

            // Workbook download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Lista_Pracownikow_${format(new Date(), 'dd_MM_yyyy')}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            toast.success('Pomyślnie wyeksportowano listę pracowników.');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Błąd podczas eksportu do Excela.');
        }
    };

    const filteredEmployees = employees.filter((employee) =>
        employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddEmployee = async (data: any) => {
        try {
            if (editingEmployee) {
                const updatedEmployee = await updateEmployee(editingEmployee.id!, data);
                setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? (updatedEmployee as Employee) : emp));
                toast.success("Zaktualizowano dane pracownika");
            } else {
                const newEmployee = await createEmployee(data);
                setEmployees(prev => [...prev, newEmployee as Employee]);
                toast.success("Dodano nowego pracownika");
            }
            setEditingEmployee(undefined);
        } catch (error) {
            console.error("Failed to save employee:", error);
            toast.error("Wystąpił błąd podczas zapisywania");
        }
    };

    const handleDeleteEmployee = async (id: number) => {
        try {
            await deleteEmployee(id);
            setEmployees(prev => prev.filter(emp => emp.id !== id));
            toast.success("Usunięto pracownika");
        } catch (error) {
            console.error("Failed to delete employee:", error);
            toast.error("Wystąpił błąd podczas usuwania");
        }
    };

    const confirmDelete = (id: number) => {
        setEmployeeToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleEditClick = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsAddDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Pracownicy</h2>
                    <p className="text-muted-foreground">Zarządzaj zespołem i stawkami</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Eksportuj Excel
                    </Button>
                    <Button size="sm" onClick={() => { setEditingEmployee(undefined); setIsAddDialogOpen(true); }} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Dodaj Pracownika
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Szukaj pracownika..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista pracowników</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Imię i Nazwisko</TableHead>
                                <TableHead>Stanowisko</TableHead>
                                <TableHead>Kontakt</TableHead>
                                <TableHead>Stawka</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Uprawnienia</TableHead>
                                <TableHead className="text-right">Akcje</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEmployees.map((employee) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">
                                        {employee.firstName} {employee.lastName}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                                            {employee.position}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                {employee.phone}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                {employee.email}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {employee.rate} PLN/h
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                                            {employee.status === 'Active' ? 'Aktywny' : 'Nieaktywny'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {getEmployeePermissionsStatus(employee)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 text-right">
                                            <Button variant="outline" size="sm" onClick={() => handlePermissionsClick(employee)} className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" />
                                                Uprawnienia
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(employee)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => confirmDelete(employee.id!)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEmployees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        Brak pracowników spełniających kryteria
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddEmployeeDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSubmit={handleAddEmployee}
                initialData={editingEmployee}
            />

            <EmployeePermissionsDialog
                open={isPermissionsDialogOpen}
                onOpenChange={setIsPermissionsDialogOpen}
                employee={selectedEmployeeForPermissions}
            />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Usuń pracownika"
                description="Czy na pewno chcesz usunąć tego pracownika? Tej operacji nie można cofnąć."
                onConfirm={() => employeeToDelete && handleDeleteEmployee(employeeToDelete)}
            />
        </div>
    );
}
