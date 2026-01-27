
"use client";

import { useState, useEffect } from "react";
import { Employee } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

    // State for tracking deleted permissions locally for immediate UI update
    const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
    // State for delete confirmation dialog
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [permissionToDelete, setPermissionToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset deletedIds when dialog closes or employee changes
    useEffect(() => {
        if (!open) {
            setDeletedIds(new Set());
        }
    }, [open, employee?.id]);

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
            // Properly parse dates from input (format: YYYY-MM-DD)
            const parsedIssueDate = new Date(issueDate + "T00:00:00");
            const parsedExpiryDate = expiryDate ? new Date(expiryDate + "T00:00:00") : null;

            // Validate parsed dates
            if (isNaN(parsedIssueDate.getTime())) {
                toast.error("Nieprawidłowy format daty wystawienia");
                setIsSubmitting(false);
                return;
            }
            if (parsedExpiryDate && isNaN(parsedExpiryDate.getTime())) {
                toast.error("Nieprawidłowy format daty ważności");
                setIsSubmitting(false);
                return;
            }

            await addEmployeePermission(employee.id!, {
                name: permissionType === "bp-passport" ? "Paszport BP" : name,
                issueDate: parsedIssueDate,
                expiryDate: parsedExpiryDate,
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
            console.error("Error adding permission:", error);
            const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
            toast.error(`Błąd podczas dodawania uprawnienia: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (id: number) => {
        setPermissionToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (permissionToDelete === null) return;

        setIsDeleting(true);
        try {
            await deleteEmployeePermission(permissionToDelete);
            // Immediately update local state to hide the deleted permission
            setDeletedIds(prev => new Set(prev).add(permissionToDelete));
            toast.success("Usunięto uprawnienie");
        } catch (_error) {
            toast.error("Błąd podczas usuwania");
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setPermissionToDelete(null);
        }
    };

    const getStatusBadge = (expiryDate?: Date | null) => {
        if (!expiryDate) return <Badge variant="secondary">Bezterminowe</Badge>;

        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysLeft = differenceInDays(expiry, today);

        if (daysLeft < 0) {
            return (
                <div className="flex items-center text-red-600 font-bold text-xs">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>NIEWAŻNE</span>
                </div>
            );
        } else if (daysLeft < 30) {
            return (
                <div className="flex items-center text-yellow-600 font-bold text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>{daysLeft}d</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center text-green-600 font-medium text-xs">
                    <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>OK</span>
                </div>
            );
        }
    };

    // Filter out deleted permissions from display
    const visiblePermissions = employee.employeePermissions?.filter(p => !deletedIds.has(p.id)) || [];

    return (
        <>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
                        <AlertDialogDescription>
                            Czy na pewno chcesz usunąć to uprawnienie? Ta operacja jest nieodwracalna.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Usuwanie..." : "Usuń"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-y-auto">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-primary" />
                            Uprawnienia: {employee.firstName} {employee.lastName}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
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

                            <div className="rounded-xl border bg-background shadow-sm">
                                <Table className="w-full table-fixed">
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[40%]">Nazwa</TableHead>
                                            <TableHead className="w-[25%]">Ważność</TableHead>
                                            <TableHead className="w-[20%]">Status</TableHead>
                                            <TableHead className="w-[15%] text-right">Usuń</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visiblePermissions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                                                    Brak przypisanych uprawnień.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visiblePermissions.map((p) => {
                                                const isBPPassport = p.name === "Paszport BP" || p.company;
                                                const roles = [];
                                                if (p.isAuthorizer) roles.push("P");
                                                if (p.isApprover) roles.push("D");
                                                if (p.isTeamLeader) roles.push("K");
                                                if (p.isCoordinator) roles.push("Ko");

                                                return (
                                                    <TableRow key={p.id} className="hover:bg-muted/10">
                                                        <TableCell className="min-w-0">
                                                            <div className="truncate font-semibold text-primary text-sm">{p.name}</div>
                                                            {p.number && <div className="truncate text-xs text-muted-foreground font-mono">{p.number}</div>}
                                                            {isBPPassport && p.company && (
                                                                <div className="truncate text-xs text-muted-foreground">{p.company}</div>
                                                            )}
                                                            {roles.length > 0 && (
                                                                <div className="flex gap-0.5 mt-0.5">
                                                                    {roles.map((role, idx) => (
                                                                        <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0">{role}</Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs min-w-0">
                                                            {p.expiryDate ? (
                                                                <div>
                                                                    <div className="font-medium">{format(new Date(p.expiryDate), "dd.MM.yy")}</div>
                                                                    <div className="text-muted-foreground">
                                                                        {differenceInDays(new Date(p.expiryDate), new Date())}d
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">∞</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(p.expiryDate)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(p.id)} className="h-7 w-7 text-muted-foreground hover:text-red-500">
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
        </>
    );
}
