"use client";

import { useState, useEffect } from "react";
import { Tool, Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Users, FileText, AlertTriangle, AlertCircle, CheckCircle, Download, QrCode, MapPin, ArrowUpDown, ArrowLeftRight, Settings2, MoreHorizontal } from "lucide-react";
import { AddToolDialog } from "./AddToolDialog";
import { toast } from "sonner";
import { ScanHistoryDialog } from "@/components/tools/ScanHistoryDialog";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Workbook } from "exceljs";
import { createTool, updateTool, deleteTool } from "@/actions/tools";
import { quickTransferTool } from "@/actions/toolTransfer";
import { ToolChecklistPdf } from "./ToolChecklistPdf";
import { ToolProtocolPdf } from "./ToolProtocolPdf";
import { ToolProtocolDialog } from "./ToolProtocolDialog";
import { ToolProtocolPreviewDialog } from "./ToolProtocolPreviewDialog";
import { ProtocolHistoryDialog } from "./ProtocolHistoryDialog";
import { ToolQrDialog } from "./ToolQrDialog";
import { BulkPrintDialog } from "./BulkPrintDialog";
import { saveProtocol } from "@/actions/protocols";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Definicja kolumn tabeli z możliwością ukrywania */
const COLUMN_CONFIG = {
    checkbox: { label: 'Zaznacz', hideable: false },
    lp: { label: 'Lp.', hideable: false },
    name: { label: 'Narzędzie', hideable: false },
    serial: { label: 'Nr seryjny', hideable: true },
    status: { label: 'Status', hideable: true },
    inspection: { label: 'Przegląd', hideable: true },
    assigned: { label: 'Przypisane', hideable: true },
    transferred: { label: 'Przekazano', hideable: true },
    protocol: { label: 'Nr Protokołu', hideable: true },
    actions: { label: 'Akcje', hideable: false },
} as const;

type ColumnKey = keyof typeof COLUMN_CONFIG;

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
    const [scanHistoryTool, setScanHistoryTool] = useState<Tool | null>(null);
    const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);

    // Column visibility - domyślnie ukryte: Przekazano, Nr Protokołu
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set([
        'checkbox', 'lp', 'name', 'serial', 'status', 'inspection', 'assigned', 'actions'
    ]));

    // Quick Transfer Drawer state
    const [transferDrawerTool, setTransferDrawerTool] = useState<Tool | null>(null);
    const [transferEmployeeSearch, setTransferEmployeeSearch] = useState('');
    const [selectedTransferEmployee, setSelectedTransferEmployee] = useState<Employee | null>(null);
    const [transferDate, setTransferDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [transferNotes, setTransferNotes] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    // Animation state for row updates
    const [animatingRowId, setAnimatingRowId] = useState<number | null>(null);

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

    /** Toggle column visibility */
    const toggleColumn = (column: ColumnKey) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(column)) {
                next.delete(column);
            } else {
                next.add(column);
            }
            return next;
        });
    };

    /** Filtered employees for quick transfer search */
    const filteredEmployees = initialEmployees.filter(emp => {
        if (transferEmployeeSearch.length < 2) return true;
        const searchLower = transferEmployeeSearch.toLowerCase();
        return (
            emp.firstName.toLowerCase().includes(searchLower) ||
            emp.lastName.toLowerCase().includes(searchLower) ||
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower)
        );
    });

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

    /** Szybkie przekazanie narzędzia z drawer */
    const handleQuickTransfer = async () => {
        if (!transferDrawerTool || !selectedTransferEmployee) return;

        setIsTransferring(true);
        try {
            const result = await quickTransferTool(
                transferDrawerTool.id!,
                selectedTransferEmployee.id!,
                transferDate,
                transferNotes || undefined
            );

            if (result.success && result.updatedTool) {
                // Real-time state update without reload
                setTools(prev => prev.map(t =>
                    t.id === transferDrawerTool.id
                        ? { ...t, transferredTo: result.updatedTool.transferredTo } as Tool
                        : t
                ));

                // Trigger animation
                setAnimatingRowId(transferDrawerTool.id!);
                setTimeout(() => setAnimatingRowId(null), 1500);

                toast.success(`Przekazano do: ${selectedTransferEmployee.firstName} ${selectedTransferEmployee.lastName}`);

                // Close drawer
                setTransferDrawerTool(null);
                setTransferEmployeeSearch('');
                setSelectedTransferEmployee(null);
                setTransferNotes('');
                setTransferDate(format(new Date(), 'yyyy-MM-dd'));
            } else {
                toast.error(result.error || 'Błąd przekazania');
            }
        } catch (error) {
            console.error('Quick transfer error:', error);
            toast.error('Wystąpił błąd');
        } finally {
            setIsTransferring(false);
        }
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

                {/* Column visibility dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto">
                            <Settings2 className="h-4 w-4 mr-2" />
                            Kolumny
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Widoczne kolumny</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(Object.keys(COLUMN_CONFIG) as ColumnKey[])
                            .filter(key => COLUMN_CONFIG[key].hideable)
                            .map(key => (
                                <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={visibleColumns.has(key)}
                                    onCheckedChange={() => toggleColumn(key)}
                                >
                                    {COLUMN_CONFIG[key].label}
                                </DropdownMenuCheckboxItem>
                            ))
                        }
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Bulk action toolbar */}
            {selectedToolIds.size > 0 && (
                <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-xl border border-primary/20 no-print">
                    <span className="font-bold text-primary">
                        Zaznaczono: {selectedToolIds.size} narzędzi
                    </span>
                    <Button
                        onClick={() => setIsBulkPrintOpen(true)}
                        size="sm"
                        className="font-bold"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Drukuj zbiorczo
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedToolIds(new Set())}
                    >
                        Odznacz wszystkie
                    </Button>
                </div>
            )}

            <Card className="no-print">
                <CardHeader>
                    <CardTitle>Lista narzędzi</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                    <TooltipProvider>
                        <Table className="w-full">
                            <TableHeader className="sticky top-0 z-10 bg-background">
                                <TableRow>
                                    {/* Checkbox - always visible */}
                                    <TableHead className="w-8 px-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedToolIds.size === filteredTools.length && filteredTools.length > 0}
                                            onChange={toggleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                    </TableHead>
                                    {/* Lp - always visible */}
                                    <TableHead className="w-10 px-1">Lp.</TableHead>
                                    {/* Narzędzie - always visible, flexible */}
                                    <TableHead>Narzędzie</TableHead>
                                    {/* Nr seryjny */}
                                    {visibleColumns.has('serial') && <TableHead className="w-28">Nr seryjny</TableHead>}
                                    {/* Status */}
                                    {visibleColumns.has('status') && <TableHead className="w-20">Status</TableHead>}
                                    {/* Przegląd */}
                                    {visibleColumns.has('inspection') && (
                                        <TableHead className="w-28 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('inspectionExpiryDate')}>
                                            Przegląd <ArrowUpDown className="h-3 w-3 inline" />
                                        </TableHead>
                                    )}
                                    {/* Przypisane */}
                                    {visibleColumns.has('assigned') && (
                                        <TableHead className="w-32 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('assignedEmployees')}>
                                            Przypisane <ArrowUpDown className="h-3 w-3 inline" />
                                        </TableHead>
                                    )}
                                    {/* Przekazano */}
                                    {visibleColumns.has('transferred') && <TableHead className="w-28">Przekazano</TableHead>}
                                    {/* Nr Protokołu */}
                                    {visibleColumns.has('protocol') && <TableHead className="w-20">Protokół</TableHead>}
                                    {/* Akcje - always visible */}
                                    <TableHead className="text-right w-32">Akcje</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTools.map((tool, index) => {
                                    const isExpired = tool.inspectionExpiryDate && new Date(tool.inspectionExpiryDate) < new Date();
                                    const isAnimating = animatingRowId === tool.id;
                                    return (
                                        <TableRow
                                            key={tool.id}
                                            className={`
                                            ${isExpired ? "bg-red-50 dark:bg-red-950/20" : ""} 
                                            ${isAnimating ? "animate-pulse bg-green-100 dark:bg-green-900/30" : ""}
                                            transition-all duration-300
                                        `}
                                        >
                                            {/* Checkbox */}
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedToolIds.has(tool.id!)}
                                                    onChange={() => toggleToolSelection(tool.id!)}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                            </TableCell>
                                            {/* Lp */}
                                            <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                                            {/* Narzędzie - with truncation and tooltip */}
                                            <TableCell>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-col max-w-[180px]">
                                                            <span className="font-medium truncate">{tool.name}</span>
                                                            <span className="text-xs text-muted-foreground truncate">
                                                                {tool.brand}{tool.model ? ` ${tool.model}` : ""}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-medium">{tool.name}</p>
                                                        <p className="text-xs">{tool.brand}{tool.model ? ` ${tool.model}` : ""}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            {/* Nr seryjny */}
                                            {visibleColumns.has('serial') && (
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono text-muted-foreground text-xs truncate max-w-[100px]">{tool.serialNumber || '-'}</span>
                                                        {tool.serialNumber && duplicateSerials.has(tool.serialNumber.trim()) && (
                                                            <Badge variant="destructive" className="text-[10px] h-5 px-1 flex items-center gap-0.5">
                                                                <AlertTriangle className="h-3 w-3" />
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {/* Status */}
                                            {visibleColumns.has('status') && <TableCell>{getStatusBadge(tool.status)}</TableCell>}
                                            {/* Przegląd */}
                                            {visibleColumns.has('inspection') && (
                                                <TableCell className="text-sm">
                                                    {getInspectionStatus(tool.inspectionExpiryDate)}
                                                </TableCell>
                                            )}
                                            {/* Przypisane */}
                                            {visibleColumns.has('assigned') && (
                                                <TableCell>
                                                    {tool.assignedEmployees && tool.assignedEmployees.length > 0 ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {tool.assignedEmployees.slice(0, 2).map(emp => (
                                                                <div key={emp.id} className="flex items-center text-xs">
                                                                    <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                                                                    <span className="truncate max-w-[110px]">{emp.firstName} {emp.lastName}</span>
                                                                </div>
                                                            ))}
                                                            {tool.assignedEmployees.length > 2 && (
                                                                <span className="text-xs text-muted-foreground">+{tool.assignedEmployees.length - 2} więcej</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            )}
                                            {/* Przekazano */}
                                            {visibleColumns.has('transferred') && (
                                                <TableCell>
                                                    {(tool as any).transferredTo ? (
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                                                {(tool as any).transferredTo.firstName[0]}{(tool as any).transferredTo.lastName[0]}
                                                            </div>
                                                            <span className="text-xs font-medium text-blue-700 truncate max-w-[80px]">
                                                                {(tool as any).transferredTo.firstName} {(tool as any).transferredTo.lastName}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            )}
                                            {/* Nr Protokołu */}
                                            {visibleColumns.has('protocol') && (
                                                <TableCell>
                                                    <span className="text-xs font-mono truncate">{tool.protocolNumber || '-'}</span>
                                                </TableCell>
                                            )}
                                            {/* Akcje */}
                                            <TableCell className="text-right px-2">
                                                <div className="flex justify-end items-center gap-0.5">
                                                    {/* Przekaz - primary action */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                                onClick={() => setTransferDrawerTool(tool)}
                                                            >
                                                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Przekaz</TooltipContent>
                                                    </Tooltip>
                                                    {/* Edytuj */}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(tool)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {/* More dropdown */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem onClick={() => handlePrintChecklist(tool)}>
                                                                <FileText className="h-4 w-4 mr-2" /> Drukuj
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedToolForProtocol(tool);
                                                                setIsHistoryDialogOpen(true);
                                                            }}>
                                                                <FileText className="h-4 w-4 mr-2" /> Historia
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => tool.id && handleOpenProtocolDialog(tool)}>
                                                                <FileText className="h-4 w-4 mr-2 text-blue-600" /> Protokół
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenQr(tool)}>
                                                                <QrCode className="h-4 w-4 mr-2" /> Kod QR
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setScanHistoryTool(tool)}>
                                                                <MapPin className="h-4 w-4 mr-2 text-emerald-600" /> Skany
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() => tool.id && confirmDelete(tool.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" /> Usuń
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredTools.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                                            Brak narzędzi spełniających kryteria
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TooltipProvider>
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

            {scanHistoryTool && (
                <ScanHistoryDialog
                    toolId={scanHistoryTool.id!}
                    toolName={scanHistoryTool.name}
                    isOpen={!!scanHistoryTool}
                    onClose={() => setScanHistoryTool(null)}
                />
            )}

            <BulkPrintDialog
                open={isBulkPrintOpen}
                onOpenChange={setIsBulkPrintOpen}
                selectedTools={tools.filter(t => t.id && selectedToolIds.has(t.id))}
                allTools={tools}
            />

            {/* Quick Transfer Drawer */}
            <Sheet
                open={!!transferDrawerTool}
                onOpenChange={(open) => {
                    if (!open) {
                        setTransferDrawerTool(null);
                        setTransferEmployeeSearch('');
                        setSelectedTransferEmployee(null);
                        setTransferNotes('');
                        setTransferDate(format(new Date(), 'yyyy-MM-dd'));
                    }
                }}
            >
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-orange-600" />
                            Przekaż narzędzie
                        </SheetTitle>
                        <SheetDescription>
                            {transferDrawerTool?.name} ({transferDrawerTool?.serialNumber || 'brak nr'})
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {/* Current assignee */}
                        {transferDrawerTool?.assignedEmployees && transferDrawerTool.assignedEmployees.length > 0 && (
                            <div className="p-3 bg-muted rounded-lg">
                                <Label className="text-xs text-muted-foreground">Obecnie przypisane do:</Label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {transferDrawerTool.assignedEmployees.map(emp => (
                                        <Badge key={emp.id} variant="secondary" className="text-sm">
                                            {emp.firstName} {emp.lastName}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Smart Search for new employee */}
                        <div className="space-y-2">
                            <Label htmlFor="transfer-search">Przekaż do pracownika</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="transfer-search"
                                    placeholder="Wpisz min. 2 znaki..."
                                    value={transferEmployeeSearch}
                                    onChange={(e) => {
                                        setTransferEmployeeSearch(e.target.value);
                                        setSelectedTransferEmployee(null);
                                    }}
                                    className="pl-10"
                                />
                            </div>

                            {/* Employee search results */}
                            {transferEmployeeSearch.length >= 2 && !selectedTransferEmployee && (
                                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                                    {filteredEmployees.slice(0, 10).map(emp => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                                            onClick={() => {
                                                setSelectedTransferEmployee(emp);
                                                setTransferEmployeeSearch(`${emp.firstName} ${emp.lastName}`);
                                            }}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                {emp.firstName[0]}{emp.lastName[0]}
                                            </div>
                                            <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                                        </button>
                                    ))}
                                    {filteredEmployees.length === 0 && (
                                        <div className="px-3 py-4 text-center text-muted-foreground">
                                            Brak wyników
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Selected employee chip */}
                            {selectedTransferEmployee && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                                        {selectedTransferEmployee.firstName[0]}{selectedTransferEmployee.lastName[0]}
                                    </div>
                                    <span className="font-medium text-green-700 dark:text-green-300">
                                        {selectedTransferEmployee.firstName} {selectedTransferEmployee.lastName}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-auto h-6 w-6"
                                        onClick={() => {
                                            setSelectedTransferEmployee(null);
                                            setTransferEmployeeSearch('');
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Transfer date */}
                        <div className="space-y-2">
                            <Label htmlFor="transfer-date">Data przekazania</Label>
                            <Input
                                id="transfer-date"
                                type="date"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="transfer-notes">Notatki (opcjonalne)</Label>
                            <Input
                                id="transfer-notes"
                                placeholder="Dodaj uwagi do przekazania..."
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                            />
                        </div>

                        {/* Submit button */}
                        <Button
                            className="w-full"
                            disabled={!selectedTransferEmployee || isTransferring}
                            onClick={handleQuickTransfer}
                        >
                            {isTransferring ? (
                                <>Przekazywanie...</>
                            ) : (
                                <>
                                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                                    Przekaż narzędzie
                                </>
                            )}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}
