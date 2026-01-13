"use client";

import { useState, useEffect } from "react";
import { Tool, Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Calendar, Users, FileText, AlertTriangle, AlertCircle, CheckCircle, Download, QrCode } from "lucide-react";
import { AddToolDialog } from "./AddToolDialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Workbook } from "exceljs";
import { createTool, updateTool, deleteTool } from "@/actions/tools";
import { ToolChecklistPdf } from "./ToolChecklistPdf";
import { ToolProtocolPdf } from "./ToolProtocolPdf";
import { ToolProtocolDialog } from "./ToolProtocolDialog";
import { ToolProtocolPreviewDialog } from "./ToolProtocolPreviewDialog";
import { ProtocolHistoryDialog } from "./ProtocolHistoryDialog";
import { ToolQrDialog } from "./ToolQrDialog";
import { saveProtocol } from "@/actions/protocols";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ArrowUpDown } from "lucide-react";

interface ToolsManagerProps {
    initialTools: Tool[];
    initialEmployees: Employee[];
}

type SortConfig = {
    key: 'assignedEmployees' | 'inspectionExpiryDate';
    direction: 'asc' | 'desc';
} | null;

export function ToolsManager({ initialTools, initialEmployees }: ToolsManagerProps) {
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | undefined>(undefined);

    // Print/PDF State
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
    const [selectedEmployeeForPrint, setSelectedEmployeeForPrint] = useState<string>("all");
    const [pdfData, setPdfData] = useState<{ tools: Tool[], employee?: Employee } | null>(null);
    const [protocolPdfData, setProtocolPdfData] = useState<{ tool: Tool, inspector?: Employee, protocolData: any } | null>(null);
    const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [selectedToolForProtocol, setSelectedToolForProtocol] = useState<Tool | null>(null);
    const [selectedToolInspector, setSelectedToolInspector] = useState<Employee | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [toolToDelete, setToolToDelete] = useState<number | null>(null);
    const [selectedToolForQr, setSelectedToolForQr] = useState<Tool | null>(null);
    const [duplicateSerials, setDuplicateSerials] = useState<Set<string>>(new Set());
    const [selectedToolIds, setSelectedToolIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        setTools(initialTools);
        const expiredTools = initialTools.filter(t =>
            t.inspectionExpiryDate && new Date(t.inspectionExpiryDate) < new Date()
        );
        if (expiredTools.length > 0) {
            toast.error(`Uwaga! ${expiredTools.length} narzędzia/i ma nieważny przegląd.`);
        }
    }, [initialTools]);

    useEffect(() => {
        // Calculate duplicate serials
        const serialCounts = new Map<string, number>();
        tools.forEach(t => {
            const sn = t.serialNumber?.trim();
            if (sn) {
                serialCounts.set(sn, (serialCounts.get(sn) || 0) + 1);
            }
        });
        const duplicates = new Set<string>();
        serialCounts.forEach((count, sn) => {
            if (count > 1) duplicates.add(sn);
        });
        setDuplicateSerials(duplicates);
    }, [tools]);

    const filteredTools = tools.filter((tool) =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tool.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tool.model || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        if (!sortConfig) return 0;

        if (sortConfig.key === 'inspectionExpiryDate') {
            const dateA = a.inspectionExpiryDate ? new Date(a.inspectionExpiryDate).getTime() : 0;
            const dateB = b.inspectionExpiryDate ? new Date(b.inspectionExpiryDate).getTime() : 0;
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (sortConfig.key === 'assignedEmployees') {
            // Sort by first employee name
            const empA = a.assignedEmployees && a.assignedEmployees.length > 0 ? a.assignedEmployees[0].lastName : "";
            const empB = b.assignedEmployees && b.assignedEmployees.length > 0 ? b.assignedEmployees[0].lastName : "";
            return sortConfig.direction === 'asc'
                ? empA.localeCompare(empB)
                : empB.localeCompare(empA);
        }

        return 0;
    }).sort((a, b) => {
        // Secondary sort: group duplicates together
        const aIsDup = a.serialNumber && duplicateSerials.has(a.serialNumber.trim());
        const bIsDup = b.serialNumber && duplicateSerials.has(b.serialNumber.trim());
        if (aIsDup && bIsDup) {
            return (a.serialNumber || "").localeCompare(b.serialNumber || "");
        }
        if (aIsDup && !bIsDup) return -1;
        if (!aIsDup && bIsDup) return 1;
        return 0;
    });

    const toggleToolSelection = (toolId: number) => {
        setSelectedToolIds(prev => {
            const next = new Set(prev);
            if (next.has(toolId)) {
                next.delete(toolId);
            } else {
                next.add(toolId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedToolIds.size === filteredTools.length) {
            setSelectedToolIds(new Set());
        } else {
            setSelectedToolIds(new Set(filteredTools.map(t => t.id!)));
        }
    };

    const handleSort = (key: 'assignedEmployees' | 'inspectionExpiryDate') => {
        setSortConfig(current => {
            if (current && current.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const handleAddTool = async (data: any) => {
        try {
            if (editingTool) {
                const updatedTool = await updateTool(editingTool.id!, data);
                setTools(prev => prev.map(t => t.id === updatedTool.id ? (updatedTool as Tool) : t));
                toast.success("Zaktualizowano dane narzędzia");
            } else {
                const newTool = await createTool(data);
                setTools(prev => [...prev, newTool as Tool]);
                toast.success("Dodano nowe narzędzie");
            }
            setEditingTool(undefined);
        } catch (error) {
            console.error("Failed to save tool:", error);
            toast.error("Wystąpił błąd podczas zapisywania");
        }
    };

    const handleDeleteTool = async (id: number) => {
        try {
            await deleteTool(id);
            setTools(prev => prev.filter(t => t.id !== id));
            toast.success("Usunięto narzędzie");
        } catch (error) {
            console.error("Failed to delete tool:", error);
            toast.error("Wystąpił błąd podczas usuwania");
        }
    };

    const confirmDelete = (id: number) => {
        setToolToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleOpenQr = (tool: Tool) => {
        setSelectedToolForQr(tool);
        setIsQrDialogOpen(true);
    };

    const handleEditClick = (tool: Tool) => {
        setEditingTool(tool);
        setIsAddDialogOpen(true);
    };

    const handlePrintChecklist = (tool: Tool) => {
        setPdfData({ tools: [tool], employee: undefined });
        setTimeout(() => {
            window.print();
            setPdfData(null);
        }, 500);
    };

    const handleOpenProtocolDialog = (tool: Tool) => {
        setIsProtocolDialogOpen(true);
        setSelectedToolForProtocol(tool);
        // Default inspector
        const inspector = tool.assignedEmployees && tool.assignedEmployees.length > 0 ? tool.assignedEmployees[0] : undefined;
        setSelectedToolInspector(inspector);
    };

    const handleProtocolSubmit = (data: any) => {
        if (!selectedToolForProtocol) return;
        setProtocolPdfData({
            tool: selectedToolForProtocol,
            inspector: selectedToolInspector,
            protocolData: data
        });
        setIsProtocolDialogOpen(false);
        setIsPreviewDialogOpen(true);
    };

    const handleConfirmPrint = async () => {
        if (!protocolPdfData || !protocolPdfData.tool.id) return;
        const result = await saveProtocol(protocolPdfData.protocolData, protocolPdfData.tool.id);
        if (result.success) {
            toast.success("Protokół zapisany w historii.");
        } else {
            toast.error("Błąd zapisu historii protokołu.");
        }

        setIsPreviewDialogOpen(false);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const handleBackToEdit = () => {
        setIsPreviewDialogOpen(false);
        setIsProtocolDialogOpen(true);
    };

    const handlePrintInventory = () => {
        let toolsToPrint = tools;
        let employeeToPrint: Employee | undefined = undefined;

        if (selectedEmployeeForPrint !== "all") {
            const empId = parseInt(selectedEmployeeForPrint);
            toolsToPrint = tools.filter(t => t.assignedEmployees?.some(e => e.id === empId));
            employeeToPrint = initialEmployees.find(e => e.id === empId);
        }

        if (toolsToPrint.length === 0) {
            toast.error("Brak narzędzi dla wybranego pracownika/kryteriów");
            return;
        }

        setPdfData({ tools: toolsToPrint, employee: employeeToPrint });
        setIsPrintDialogOpen(false);
        setTimeout(() => {
            window.print();
            setPdfData(null);
        }, 500);
    };
    const handleExportExcel = async () => {
        try {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Narzędzia');

            worksheet.columns = [
                { header: 'Narzędzie', key: 'name', width: 25 },
                { header: 'Marka', key: 'brand', width: 15 },
                { header: 'Model', key: 'model', width: 15 },
                { header: 'Numer Seryjny', key: 'serialNumber', width: 20 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Przypisane Osoby', key: 'assigned', width: 30 },
                { header: 'Nr Protokołu', key: 'protocolNumber', width: 15 },
                { header: 'Przegląd (Ważność)', key: 'inspectionDate', width: 20 },
            ];

            // Style header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            const today = new Date();

            tools.forEach(tool => {
                const assignedNames = tool.assignedEmployees?.map(e => `${e.firstName} ${e.lastName}`).join(', ') || '—';
                const statusLabel = tool.status === 'Available' ? 'Dostępne' :
                    tool.status === 'In Use' ? 'W użyciu' :
                        tool.status === 'Maintenance' ? 'Serwis' :
                            tool.status === 'Lost' ? 'Zgubione' : tool.status;

                const row = worksheet.addRow({
                    name: tool.name,
                    brand: tool.brand,
                    model: tool.model || '—',
                    serialNumber: tool.serialNumber,
                    status: statusLabel,
                    assigned: assignedNames,
                    protocolNumber: tool.protocolNumber || '—',
                    inspectionDate: tool.inspectionExpiryDate ? format(new Date(tool.inspectionExpiryDate), 'dd.MM.yyyy') : 'Brak danych'
                });

                // Conditional formatting for inspection date
                if (tool.inspectionExpiryDate) {
                    const expiryCell = row.getCell(7);
                    const isExpired = new Date(tool.inspectionExpiryDate) < today;

                    if (isExpired) {
                        expiryCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFC7CE' } // Red
                        };
                        expiryCell.font = { color: { argb: 'FF9C0006' } };
                    } else {
                        expiryCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFC6EFCE' } // Green
                        };
                        expiryCell.font = { color: { argb: 'FF006100' } };
                    }
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Inwentaryzacja_Narzedzi_${format(new Date(), 'dd_MM_yyyy')}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            toast.success('Pomyślnie wyeksportowano inwentaryzację narzędzi.');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Błąd podczas eksportu do Excela.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Available': return <Badge className="bg-green-500">Dostępne</Badge>;
            case 'In Use': return <Badge className="bg-blue-500">W użyciu</Badge>;
            case 'Maintenance': return <Badge className="bg-orange-500">Serwis</Badge>;
            case 'Lost': return <Badge className="bg-red-500">Zgubione</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getInspectionStatus = (expiryDate?: Date) => {
        if (!expiryDate) return <Badge variant="outline">Brak danych</Badge>;

        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysLeft = differenceInDays(expiry, today);

        if (daysLeft < 0) {
            return (
                <div className="flex items-center text-red-600 font-bold animate-pulse">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    PRZEGLĄD NIEWAŻNY ({Math.abs(daysLeft)} dni temu)
                </div>
            );
        } else if (daysLeft < 14) {
            return (
                <div className="flex items-center text-yellow-600 font-bold">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Za {daysLeft} dni
                </div>
            );
        } else {
            return (
                <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    OK (za {daysLeft} dni)
                </div>
            );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Narzędzia</h2>
                    <p className="text-muted-foreground">Zarządzaj sprzętem, przeglądami i przypisaniami</p>
                </div>
                <div className="flex gap-2">
                    {selectedToolIds.size > 0 && (
                        <Button variant="default" size="sm" onClick={() => {
                            const selectedTools = tools.filter(t => selectedToolIds.has(t.id!));
                            setPdfData({ tools: selectedTools, employee: undefined });
                            setTimeout(() => {
                                window.print();
                                setPdfData(null);
                            }, 500);
                        }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                            <FileText className="w-4 h-4" />
                            Drukuj zaznaczone ({selectedToolIds.size})
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Eksportuj Excel
                    </Button>
                    <Button variant="outline" onClick={() => setIsPrintDialogOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Raport / Inwentaryzacja
                    </Button>
                    <Button onClick={() => { setEditingTool(undefined); setIsAddDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj narzędzie
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 no-print">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Szukaj narzędzia, marki lub numeru seryjnego..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Card className="no-print">
                <CardHeader>
                    <CardTitle>Lista narzędzi</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedToolIds.size === filteredTools.length && filteredTools.length > 0}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                </TableHead>
                                <TableHead className="w-12">Lp.</TableHead>
                                <TableHead>Narzędzie</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('inspectionExpiryDate')}>
                                    Przegląd (Ważność) <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('assignedEmployees')}>
                                    Przypisane osoby <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                </TableHead>
                                <TableHead>Nr Protokołu</TableHead>
                                <TableHead className="text-right">Akcje</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTools.map((tool, index) => {
                                const isExpired = tool.inspectionExpiryDate && new Date(tool.inspectionExpiryDate) < new Date();
                                return (
                                    <TableRow key={tool.id} className={isExpired ? "bg-red-50 dark:bg-red-950/20" : ""}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedToolIds.has(tool.id!)}
                                                onChange={() => toggleToolSelection(tool.id!)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{tool.name}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {tool.brand}{tool.model ? ` ${tool.model}` : ""} •
                                                    <span className={tool.serialNumber && duplicateSerials.has(tool.serialNumber.trim()) ? "text-orange-600 font-bold bg-orange-100 px-1 rounded flex items-center gap-0.5" : ""}>
                                                        {tool.serialNumber && duplicateSerials.has(tool.serialNumber.trim()) && <AlertTriangle className="h-3 w-3" />}
                                                        {tool.serialNumber}
                                                        {tool.serialNumber && duplicateSerials.has(tool.serialNumber.trim()) && <span className="text-[10px]">(DUPLIKAT)</span>}
                                                    </span>
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(tool.status)}</TableCell>
                                        <TableCell>
                                            {getInspectionStatus(tool.inspectionExpiryDate)}
                                        </TableCell>
                                        <TableCell>
                                            {tool.assignedEmployees && tool.assignedEmployees.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {tool.assignedEmployees.map(emp => (
                                                        <div key={emp.id} className="flex items-center text-sm">
                                                            <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                                                            {emp.firstName} {emp.lastName}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-mono">{tool.protocolNumber || '-'}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" title="Drukuj etykietę/kartę" onClick={() => handlePrintChecklist(tool)}>
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    setSelectedToolForProtocol(tool);
                                                    setIsHistoryDialogOpen(true);
                                                }}>
                                                    Historia
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => tool.id && handleOpenProtocolDialog(tool)}>
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenQr(tool)} title="Kod QR">
                                                    <QrCode className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(tool)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => tool.id && confirmDelete(tool.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredTools.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        Brak narzędzi spełniających kryteria
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddToolDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSubmit={handleAddTool}
                initialData={editingTool}
                employees={initialEmployees}
            />

            <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Drukuj Raport / Inwentaryzację</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="employee-print" className="text-right">
                                Pracownik
                            </Label>
                            <Select value={selectedEmployeeForPrint} onValueChange={setSelectedEmployeeForPrint}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Wybierz pracownika lub 'Wszyscy'" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Wszystkie narzędzia</SelectItem>
                                    {initialEmployees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id?.toString() || ""}>
                                            {emp.firstName} {emp.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handlePrintInventory}>Generuj PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {pdfData && (
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
                    <ToolChecklistPdf tools={pdfData.tools} employee={pdfData.employee} />
                </div>
            )}
            {protocolPdfData && (
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
                    <ToolProtocolPdf tool={protocolPdfData.tool} inspector={protocolPdfData.inspector} protocolData={protocolPdfData.protocolData} />
                </div>
            )}

            <ToolProtocolDialog
                open={isProtocolDialogOpen}
                onOpenChange={setIsProtocolDialogOpen}
                tool={selectedToolForProtocol}
                inspector={selectedToolInspector}
                onSubmit={handleProtocolSubmit}
            />

            <ToolProtocolPreviewDialog
                open={isPreviewDialogOpen}
                onOpenChange={setIsPreviewDialogOpen}
                data={protocolPdfData}
                onPrint={handleConfirmPrint}
                onEdit={handleBackToEdit}
            />

            <ProtocolHistoryDialog
                open={isHistoryDialogOpen}
                onOpenChange={setIsHistoryDialogOpen}
                tool={selectedToolForProtocol}
            />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Usuń narzędzie"
                description="Czy na pewno chcesz usunąć to narzędzie? Tej operacji nie można cofnąć."
                onConfirm={() => toolToDelete && handleDeleteTool(toolToDelete)}
            />

            <ToolQrDialog
                open={isQrDialogOpen}
                onOpenChange={setIsQrDialogOpen}
                tool={selectedToolForQr}
            />
        </div>
    );
}
