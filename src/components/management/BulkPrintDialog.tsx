'use client';

import { useState, useMemo } from 'react';
import { Tool, Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Printer, User, QrCode, Tag, FileText } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { InspectionSticker } from './InspectionSticker';

interface BulkPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTools: Tool[];
    allEmployees?: Employee[];
}

// Get initials for QR label
function getInitials(employees: Array<{ firstName: string; lastName: string }> | undefined): string {
    if (!employees || employees.length === 0) return '--';
    const emp = employees[0];
    return ((emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')).toUpperCase() || '--';
}

export function BulkPrintDialog({ open, onOpenChange, selectedTools, allEmployees = [] }: BulkPrintDialogProps) {
    const [employeeFilter, setEmployeeFilter] = useState<string>('all');
    const [showQr, setShowQr] = useState(true);
    const [showSticker, setShowSticker] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [printProtocols, setPrintProtocols] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Get unique employees from selected tools
    const toolEmployees = useMemo(() => {
        const empMap = new Map<number, Employee>();
        selectedTools.forEach(tool => {
            (tool.assignedEmployees || []).forEach((emp: any) => {
                if (emp.id && !empMap.has(emp.id)) {
                    empMap.set(emp.id, emp);
                }
            });
        });
        return Array.from(empMap.values());
    }, [selectedTools]);

    // Filter tools by selected employee
    const filteredTools = useMemo(() => {
        if (employeeFilter === 'all') return selectedTools;
        const empId = parseInt(employeeFilter);
        return selectedTools.filter(tool =>
            (tool.assignedEmployees || []).some((e: any) => e.id === empId)
        );
    }, [selectedTools, employeeFilter]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        let cardsHtml = '';

        // Tool cards
        if (showQr || showSticker || showInfo) {
            filteredTools.forEach(tool => {
                const lastInsp = tool.lastInspectionDate ? new Date(tool.lastInspectionDate) : null;
                const expiry = tool.inspectionExpiryDate ? new Date(tool.inspectionExpiryDate) : null;
                const toolUrl = `${origin}/tools/${tool.id || 0}`;
                const initials = getInitials(tool.assignedEmployees);
                const toolNumber = String(tool.id || 0).padStart(4, '0');
                const brandLabel = `ERIZED/${initials} ${toolNumber}`;

                // Format dates
                const lastInspStr = lastInsp ? lastInsp.toLocaleDateString('pl-PL') : '-';
                const expiryStr = expiry ? expiry.toLocaleDateString('pl-PL') : '-';
                const deviceName = (tool.name || '-').substring(0, 20);
                const serialNum = (tool.serialNumber || '-').substring(0, 15);

                cardsHtml += `
                    <div class="tool-card" style="page-break-inside: avoid; border: 2px solid #059669; border-radius: 12px; padding: 16px; margin-bottom: 16px; font-family: Arial, sans-serif;">
                        ${showInfo ? `
                            <div style="margin-bottom: 12px;">
                                <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">${tool.name}</h2>
                                <p style="margin: 0; font-size: 12px; color: #666;">
                                    ${tool.brand || ''} ${tool.model ? `| ${tool.model}` : ''} | S/N: ${tool.serialNumber}
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #059669; font-weight: bold;">
                                    Przypisane do: ${(tool.assignedEmployees || []).map((e: any) => `${e.firstName} ${e.lastName}`).join(', ') || '-'}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 16px; align-items: center; justify-content: center;">
                            ${showQr ? `
                                <div style="text-align: center; position: relative; width: 100px; height: 100px;">
                                    <!-- QR with ERIZED overlay -->
                                    <svg width="100" height="100" viewBox="0 0 100 100" style="background: white; border: 1px solid #e0e0e0; border-radius: 8px;">
                                        <!-- QR placeholder pattern -->
                                        <rect x="5" y="5" width="90" height="90" fill="url(#qrPattern${tool.id})"/>
                                        <defs>
                                            <pattern id="qrPattern${tool.id}" patternUnits="userSpaceOnUse" width="8" height="8">
                                                <rect width="4" height="4" fill="#1a1a2e"/>
                                                <rect x="4" y="4" width="4" height="4" fill="#1a1a2e"/>
                                            </pattern>
                                        </defs>
                                        <!-- Corner markers -->
                                        <rect x="8" y="8" width="20" height="20" fill="#1a1a2e"/>
                                        <rect x="11" y="11" width="14" height="14" fill="white"/>
                                        <rect x="14" y="14" width="8" height="8" fill="#1a1a2e"/>
                                        <rect x="72" y="8" width="20" height="20" fill="#1a1a2e"/>
                                        <rect x="75" y="11" width="14" height="14" fill="white"/>
                                        <rect x="78" y="14" width="8" height="8" fill="#1a1a2e"/>
                                        <rect x="8" y="72" width="20" height="20" fill="#1a1a2e"/>
                                        <rect x="11" y="75" width="14" height="14" fill="white"/>
                                        <rect x="14" y="78" width="8" height="8" fill="#1a1a2e"/>
                                        <!-- ERIZED overlay in center -->
                                        <rect x="28" y="35" width="44" height="30" fill="white" stroke="#1a1a2e" stroke-width="2"/>
                                        <text x="50" y="45" text-anchor="middle" fill="#1a1a2e" font-size="7" font-weight="bold">ERIZED</text>
                                        <text x="50" y="53" text-anchor="middle" fill="#1a1a2e" font-size="6">/${initials}</text>
                                        <text x="50" y="62" text-anchor="middle" fill="#1a1a2e" font-size="9" font-weight="bold">${toolNumber}</text>
                                    </svg>
                                </div>
                            ` : ''}
                            
                            ${showSticker ? `
                                <div style="text-align: center; width: 100px; height: 100px;">
                                    <!-- Improved inspection sticker -->
                                    <svg width="100" height="100" viewBox="0 0 100 100">
                                        <!-- Outer green ring -->
                                        <circle cx="50" cy="50" r="48" fill="#059669" stroke="#064e3b" stroke-width="1"/>
                                        <!-- Inner white circle -->
                                        <circle cx="50" cy="50" r="40" fill="white" stroke="#064e3b" stroke-width="0.5"/>
                                        
                                        <!-- Title -->
                                        <text x="50" y="22" text-anchor="middle" fill="#064e3b" font-size="6" font-weight="bold">KONTROLA</text>
                                        
                                        <!-- Device name -->
                                        <text x="50" y="32" text-anchor="middle" fill="#059669" font-size="5" font-weight="bold">${deviceName}</text>
                                        
                                        <!-- Serial number -->
                                        <text x="50" y="40" text-anchor="middle" fill="#064e3b" font-size="4">S/N: ${serialNum}</text>
                                        
                                        <!-- Divider -->
                                        <line x1="20" y1="45" x2="80" y2="45" stroke="#059669" stroke-width="0.5"/>
                                        
                                        <!-- Inspection date -->
                                        <text x="50" y="54" text-anchor="middle" fill="#666" font-size="4">Data przeglądu:</text>
                                        <text x="50" y="62" text-anchor="middle" fill="#064e3b" font-size="5" font-weight="bold">${lastInspStr}</text>
                                        
                                        <!-- Divider -->
                                        <line x1="20" y1="67" x2="80" y2="67" stroke="#059669" stroke-width="0.5"/>
                                        
                                        <!-- Next inspection -->
                                        <text x="50" y="75" text-anchor="middle" fill="#059669" font-size="4" font-weight="bold">Ważna do:</text>
                                        <text x="50" y="84" text-anchor="middle" fill="#064e3b" font-size="6" font-weight="bold">${expiryStr}</text>
                                    </svg>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        }


        // Protocols
        let protocolsHtml = '';
        if (printProtocols) {
            filteredTools.forEach(tool => {
                const protocols = (tool as any).protocols || [];
                const toolUrl = `${origin}/tools/${tool.id || 0}`;

                protocols.forEach((protocol: any) => {
                    protocolsHtml += `
                        <div class="protocol-page" style="page-break-after: always; padding: 20px; font-family: Arial, sans-serif;">
                            <h1 style="text-align: center; font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px;">
                                PROTOKÓŁ PRZEGLĄDU NARZĘDZIA
                            </h1>
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; width: 30%; font-weight: bold; background: #f0f0f0;">Narzędzie:</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${tool.name}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background: #f0f0f0;">Marka / Model:</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${tool.brand || '-'} ${tool.model || ''}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background: #f0f0f0;">Numer seryjny:</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${tool.serialNumber}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background: #f0f0f0;">Data przeglądu:</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${new Date(protocol.date).toLocaleDateString('pl-PL')}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background: #f0f0f0;">Inspektor:</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${protocol.inspectorName}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background: #f0f0f0;">Wynik:</td>
                                    <td style="border: 1px solid #000; padding: 8px; ${protocol.result === 'POZYTYWNA' ? 'color: green;' : 'color: red;'} font-weight: bold;">
                                        ${protocol.result}
                                    </td>
                                </tr>
                            </table>
                            <div style="border: 1px solid #000; padding: 10px; min-height: 100px; margin-bottom: 30px;">
                                <strong>Treść protokołu:</strong><br/>
                                ${protocol.content || '-'}
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                                <div style="width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center;">
                                    Podpis inspektora
                                </div>
                                <div style="width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center;">
                                    Data
                                </div>
                            </div>
                            <div style="text-align: right; margin-top: 20px;">
                                <div id="protocol-qr-${tool.id}-${protocol.id}" style="display: inline-block; background: #f0f0f0; padding: 8px; border-radius: 8px;">
                                    <svg width="60" height="60" style="background: white;"></svg>
                                </div>
                                <p style="font-size: 8px; margin: 4px 0 0 0;">Zeskanuj aby zobaczyć narzędzie</p>
                            </div>
                        </div>
                    `;
                });
            });
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Druk narzędzi</title>
                    <style>
                        @page { margin: 15mm; }
                        body { margin: 0; padding: 0; }
                        .tool-card { page-break-inside: avoid; }
                    </style>
                </head>
                <body>
                    ${cardsHtml}
                    ${protocolsHtml}
                </body>
                <script>
                    window.onload = () => {
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    };
                </script>
            </html>
        `);
        printWindow.document.close();
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Drukowanie zbiorcze
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Employee filter */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Drukuj dla pracownika:
                        </Label>
                        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Wybierz pracownika" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Wszyscy ({selectedTools.length} narzędzi)</SelectItem>
                                {toolEmployees.map(emp => {
                                    const count = selectedTools.filter(t =>
                                        (t.assignedEmployees || []).some((e: any) => e.id === emp.id)
                                    ).length;
                                    return (
                                        <SelectItem key={emp.id} value={String(emp.id)}>
                                            {emp.firstName} {emp.lastName} ({count} narzędzi)
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* What to print */}
                    <div className="space-y-3">
                        <Label>Co drukować na karcie narzędzia:</Label>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Checkbox
                                id="showInfo"
                                checked={showInfo}
                                onCheckedChange={(v) => setShowInfo(v === true)}
                            />
                            <Label htmlFor="showInfo" className="cursor-pointer flex-1">
                                <span className="font-medium">Informacje o narzędziu</span>
                                <span className="text-sm text-muted-foreground block">Nazwa, marka, S/N, przypisanie</span>
                            </Label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Checkbox
                                id="showQr"
                                checked={showQr}
                                onCheckedChange={(v) => setShowQr(v === true)}
                            />
                            <Label htmlFor="showQr" className="cursor-pointer flex-1 flex items-center gap-2">
                                <QrCode className="w-4 h-4 text-primary" />
                                <div>
                                    <span className="font-medium">Kod QR</span>
                                    <span className="text-sm text-muted-foreground block">ERIZED/inicjały numer</span>
                                </div>
                            </Label>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <Checkbox
                                id="showSticker"
                                checked={showSticker}
                                onCheckedChange={(v) => setShowSticker(v === true)}
                            />
                            <Label htmlFor="showSticker" className="cursor-pointer flex-1 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-600" />
                                <div>
                                    <span className="font-medium">Naklejka kontrolna</span>
                                    <span className="text-sm text-muted-foreground block">Z datą kontroli i ważności</span>
                                </div>
                            </Label>
                        </div>
                    </div>

                    {/* Protocols */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Checkbox
                            id="printProtocols"
                            checked={printProtocols}
                            onCheckedChange={(v) => setPrintProtocols(v === true)}
                        />
                        <Label htmlFor="printProtocols" className="cursor-pointer flex-1 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <div>
                                <span className="font-medium">Protokoły przeglądów</span>
                                <span className="text-sm text-muted-foreground block">Osobne strony z małym QR</span>
                            </div>
                        </Label>
                    </div>

                    {/* Summary */}
                    <div className="text-sm text-muted-foreground p-3 bg-slate-100 rounded-lg">
                        Do wydruku: <strong>{filteredTools.length}</strong> kart narzędzi
                        {printProtocols && `, ${filteredTools.reduce((sum, t) => sum + ((t as any).protocols?.length || 0), 0)} protokołów`}
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                        Anuluj
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="flex-1 font-bold"
                        disabled={filteredTools.length === 0 || (!showQr && !showSticker && !showInfo && !printProtocols)}
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Drukuj ({filteredTools.length})
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
