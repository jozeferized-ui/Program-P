
"use client";

import { useState } from "react";
import { Employee, EmployeePermission } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { Trash2, AlertTriangle, CheckCircle, AlertCircle, Plus, ShieldCheck } from "lucide-react";
import { addEmployeePermission, deleteEmployeePermission } from "@/actions/employees";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface EmployeePermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
}

export function EmployeePermissionsDialog({ open, onOpenChange, employee }: EmployeePermissionsDialogProps) {
    const [name, setName] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [number, setNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!employee) return null;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !issueDate) {
            toast.error("Nazwa i data wystawienia są wymagane");
            return;
        }

        setIsSubmitting(true);
        try {
            await addEmployeePermission(employee.id!, {
                name,
                issueDate: new Date(issueDate),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                number,
            });
            toast.success("Dodano uprawnienie");
            setName("");
            setIssueDate("");
            setExpiryDate("");
            setNumber("");
        } catch (error) {
            toast.error("Błąd podczas dodawania uprawnienia");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć to uprawnienie?")) return;
        try {
            await deleteEmployeePermission(id);
            toast.success("Usunięto uprawnienie");
        } catch (error) {
            toast.error("Błąd podczas usuwania");
        }
    };

    const getStatusBadge = (expiryDate?: Date | null) => {
        if (!expiryDate) return <Badge variant="secondary">Bezterminowe</Badge>;

        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysLeft = differenceInDays(expiry, today);

        if (daysLeft < 0) {
            return (
                <div className="flex items-center text-red-600 font-bold">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    NIEWAŻNE
                </div>
            );
        } else if (daysLeft < 30) {
            return (
                <div className="flex items-center text-yellow-600 font-bold">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Wygaśnie za {daysLeft} dni
                </div>
            );
        } else {
            return (
                <div className="flex items-center text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Ważne
                </div>
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        Uprawnienia: {employee.firstName} {employee.lastName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Add New Permission Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dodaj nowe uprawnienie</h3>
                        </div>

                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-muted/20 p-6 rounded-xl border border-dashed border-muted-foreground/30">
                            <div className="space-y-2 lg:col-span-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Nazwa Uprawnienia</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="np. SEP G1 (E/D), UDT I WJO"
                                    className="bg-background shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Numer certyfikatu</Label>
                                <Input
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value)}
                                    placeholder="opcjonalnie"
                                    className="bg-background shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Data wystawienia</Label>
                                <Input
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    className="bg-background shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Data ważności</Label>
                                <Input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="bg-background shadow-sm"
                                />
                            </div>
                            <div className="lg:col-span-4 flex justify-end">
                                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Zatwierdź i Dodaj
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Existing Permissions List */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Aktualne certyfikaty i uprawnienia</h3>
                        </div>

                        <div className="rounded-xl border overflow-hidden bg-background shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-[30%]">Nazwa</TableHead>
                                        <TableHead>Numer</TableHead>
                                        <TableHead>Wystawiono</TableHead>
                                        <TableHead>Ważność</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Opcje</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employee.employeePermissions?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                                                Brak przypisanych uprawnień dla tego pracownika.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employee.employeePermissions?.map((p) => (
                                            <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                                                <TableCell className="font-semibold text-primary">{p.name}</TableCell>
                                                <TableCell className="text-sm font-mono text-muted-foreground">{p.number || "—"}</TableCell>
                                                <TableCell className="text-sm">{format(new Date(p.issueDate), "dd MMM yyyy")}</TableCell>
                                                <TableCell className="text-sm">
                                                    {p.expiryDate ? (
                                                        <span className="font-medium">{format(new Date(p.expiryDate), "dd MMM yyyy")}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground uppercase text-[10px] tracking-tighter bg-muted px-1.5 py-0.5 rounded">Bezterminowo</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(p.expiryDate)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
