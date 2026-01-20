
"use client";

import { useState } from "react";
import { Employee, EmployeePermission } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { Trash2, AlertTriangle, CheckCircle, AlertCircle, Plus, ShieldCheck, Building2, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { addEmployeePermission, deleteEmployeePermission } from "@/actions/employees";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface EmployeePermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
}

export function EmployeePermissionsDialog({ open, onOpenChange, employee }: EmployeePermissionsDialogProps) {
    const [permissionType, setPermissionType] = useState<"standard" | "bp-passport">("standard");
    const [name, setName] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [number, setNumber] = useState("");
    // BP Passport specific fields
    const [company, setCompany] = useState("");
    const [issuer, setIssuer] = useState("");
    const [registryNumber, setRegistryNumber] = useState("");
    const [isAuthorizer, setIsAuthorizer] = useState(false);
    const [isApprover, setIsApprover] = useState(false);
    const [isTeamLeader, setIsTeamLeader] = useState(false);
    const [isCoordinator, setIsCoordinator] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!employee) return null;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate based on permission type
        if (permissionType === "standard" && !name) {
            toast.error("Nazwa uprawnienia jest wymagana");
            return;
        }
        if (!issueDate) {
            toast.error("Data wystawienia jest wymagana");
            return;
        }

        setIsSubmitting(true);
        try {
            await addEmployeePermission(employee.id!, {
                name: permissionType === "bp-passport" ? "Paszport BP" : name,
                issueDate: new Date(issueDate),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                number,
                // BP Passport specific fields
                company: permissionType === "bp-passport" ? company : undefined,
                issuer: permissionType === "bp-passport" ? issuer : undefined,
                registryNumber: permissionType === "bp-passport" ? registryNumber : undefined,
                isAuthorizer: permissionType === "bp-passport" ? isAuthorizer : undefined,
                isApprover: permissionType === "bp-passport" ? isApprover : undefined,
                isTeamLeader: permissionType === "bp-passport" ? isTeamLeader : undefined,
                isCoordinator: permissionType === "bp-passport" ? isCoordinator : undefined,
            });
            toast.success("Dodano uprawnienie");
            // Reset all fields
            setPermissionType("standard");
            setName("");
            setIssueDate("");
            setExpiryDate("");
            setNumber("");
            setCompany("");
            setIssuer("");
            setRegistryNumber("");
            setIsAuthorizer(false);
            setIsApprover(false);
            setIsTeamLeader(false);
            setIsCoordinator(false);
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

                        <form onSubmit={handleAdd} className="space-y-4 bg-muted/20 p-6 rounded-xl border border-dashed border-muted-foreground/30">
                            {/* Permission Type Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium uppercase text-muted-foreground">Typ Uprawnienia</Label>
                                <Select value={permissionType} onValueChange={(value: "standard" | "bp-passport") => setPermissionType(value)}>
                                    <SelectTrigger className="bg-background shadow-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standardowe uprawnienie</SelectItem>
                                        <SelectItem value="bp-passport">Paszport BP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Standard Permission Fields */}
                            {permissionType === "standard" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                </div>
                            )}

                            {/* BP Passport Fields */}
                            {permissionType === "bp-passport" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                                                <Building2 className="w-3 h-3" />
                                                Firma
                                            </Label>
                                            <Input
                                                value={company}
                                                onChange={(e) => setCompany(e.target.value)}
                                                placeholder="Nazwa firmy"
                                                className="bg-background shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium uppercase text-muted-foreground">Numer ewidencyjny</Label>
                                            <Input
                                                value={registryNumber}
                                                onChange={(e) => setRegistryNumber(e.target.value)}
                                                placeholder="Nr ewidencyjny"
                                                className="bg-background shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium uppercase text-muted-foreground">Paszport wydał</Label>
                                            <Input
                                                value={issuer}
                                                onChange={(e) => setIssuer(e.target.value)}
                                                placeholder="Imię i nazwisko"
                                                className="bg-background shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium uppercase text-muted-foreground">W dniu (data wystawienia)</Label>
                                            <Input
                                                type="date"
                                                value={issueDate}
                                                onChange={(e) => setIssueDate(e.target.value)}
                                                className="bg-background shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium uppercase text-muted-foreground">Data ważności paszportu</Label>
                                        <Input
                                            type="date"
                                            value={expiryDate}
                                            onChange={(e) => setExpiryDate(e.target.value)}
                                            className="bg-background shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2 border-t">
                                        <Label className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                                            <UserCheck className="w-3 h-3" />
                                            Role i uprawnienia
                                        </Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="authorizer"
                                                    checked={isAuthorizer}
                                                    onCheckedChange={(checked) => setIsAuthorizer(checked as boolean)}
                                                />
                                                <label htmlFor="authorizer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Poleceniodawca
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="approver"
                                                    checked={isApprover}
                                                    onCheckedChange={(checked) => setIsApprover(checked as boolean)}
                                                />
                                                <label htmlFor="approver" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Dopuszczający
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="teamleader"
                                                    checked={isTeamLeader}
                                                    onCheckedChange={(checked) => setIsTeamLeader(checked as boolean)}
                                                />
                                                <label htmlFor="teamleader" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Kierujący zespołem
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="coordinator"
                                                    checked={isCoordinator}
                                                    onCheckedChange={(checked) => setIsCoordinator(checked as boolean)}
                                                />
                                                <label htmlFor="coordinator" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Koordynujący
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
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
                                        employee.employeePermissions?.map((p) => {
                                            const isBPPassport = p.name === "Paszport BP" || p.company;
                                            const roles = [];
                                            if (p.isAuthorizer) roles.push("Poleceniodawca");
                                            if (p.isApprover) roles.push("Dopuszczający");
                                            if (p.isTeamLeader) roles.push("Kierujący");
                                            if (p.isCoordinator) roles.push("Koordynujący");

                                            return (
                                                <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-semibold text-primary">{p.name}</div>
                                                            {isBPPassport && (
                                                                <>
                                                                    {p.company && (
                                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                            <Building2 className="w-3 h-3" />
                                                                            {p.company}
                                                                        </div>
                                                                    )}
                                                                    {p.issuer && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Wydał: {p.issuer}
                                                                        </div>
                                                                    )}
                                                                    {roles.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {roles.map((role, idx) => (
                                                                                <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                                                                                    {role}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono text-muted-foreground">
                                                        {isBPPassport && p.registryNumber ? (
                                                            <div>
                                                                <div className="font-medium">{p.registryNumber}</div>
                                                                <div className="text-[10px] text-muted-foreground">{p.number || "—"}</div>
                                                            </div>
                                                        ) : (
                                                            p.number || "—"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{format(new Date(p.issueDate), "dd MMM yyyy")}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {p.expiryDate ? (
                                                            <div>
                                                                <div className="font-medium">{format(new Date(p.expiryDate), "dd MMM yyyy")}</div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    ({differenceInDays(new Date(p.expiryDate), new Date())} dni ważności)
                                                                </div>
                                                            </div>
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
                                            )
                                        })
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
