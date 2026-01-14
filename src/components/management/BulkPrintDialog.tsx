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
                const lastInsp = tool.lastInspectionDate ? new Date(tool.lastInspectionDate) : new Date();
                const expiry = tool.inspectionExpiryDate ? new Date(tool.inspectionExpiryDate) : new Date(lastInsp.getTime() + 365 * 24 * 60 * 60 * 1000);
                const toolUrl = `${origin}/tools/${tool.id || 0}`;
                const initials = getInitials(tool.assignedEmployees);
                const toolNumber = String(tool.id || 0).padStart(4, '0');

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
                        
                        <div style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                            ${showQr ? `
                                <div style="text-align: center;">
                                    <div id="qr-${tool.id}" style="width: 80px; height: 80px; background: #f0f0f0;"></div>
                                    <p style="margin: 4px 0 0 0; font-size: 8px; font-weight: bold;">ERIZED/${initials} ${toolNumber}</p>
                                </div>
                            ` : ''}
                            
                            ${showSticker ? `
                                <div style="text-align: center;">
                                    <svg width="80" height="80" viewBox="0 0 100 100">
                                        <!-- Outer green ring -->
                                        <circle cx="50" cy="50" r="48" fill="#059669" stroke="#064e3b" stroke-width="1"/>
                                        <!-- Inner white circle -->
                                        <circle cx="50" cy="50" r="35" fill="white" stroke="#064e3b" stroke-width="0.5"/>
                                        
                                        <!-- Month numbers -->
                                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                    const angle = (m * 30 - 90) * (Math.PI / 180);
                    const x = 50 + Math.cos(angle) * 42;
                    const y = 50 + Math.sin(angle) * 42;
                    const isSelected = m === (expiry.getMonth() + 1);
                    return `
                                                ${isSelected ? `<circle cx="${x}" cy="${y}" r="5" fill="white"/>` : ''}
                                                <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" 
                                                    fill="${isSelected ? '#064e3b' : 'white'}" 
                                                    font-size="6" font-weight="${isSelected ? 'bold' : 'normal'}">
                                                    ${m}
                                                </text>
                                            `;
                }).join('')}
                                        
                                        <!-- Year numbers -->
                                        ${[25, 26, 27].map((y, i) => {
                    const angle = ((i - 1) * 35 + 90) * (Math.PI / 180);
                    const x = 50 + Math.cos(angle) * 42;
                    const yPos = 50 + Math.sin(angle) * 42;
                    const isSelected = y === (expiry.getFullYear() % 100);
                    return `
                                                ${isSelected ? `<circle cx="${x}" cy="${yPos}" r="5" fill="white"/>` : ''}
                                                <text x="${x}" y="${yPos}" text-anchor="middle" dominant-baseline="central" 
                                                    fill="${isSelected ? '#064e3b' : 'white'}" 
                                                    font-size="6" font-weight="${isSelected ? 'bold' : 'normal'}">
                                                    ${y}
                                                </text>
                                            `;
                }).join('')}
                                        
                                        <!-- Center text -->
                                        <text x="50" y="38" text-anchor="middle" fill="#064e3b" font-size="5" font-weight="bold">Skontrolowano</text>
                                        <text x="50" y="46" text-anchor="middle" fill="#064e3b" font-size="4">Nr: ${(tool.serialNumber || '-').substring(0, 10)}</text>
                                        <text x="50" y="52" text-anchor="middle" fill="#064e3b" font-size="4">${(tool.model || tool.brand || '-').substring(0, 12)}</text>
                                        <line x1="26" y1="57" x2="74" y2="57" stroke="#064e3b" stroke-width="0.5"/>
                                        <text x="50" y="63" text-anchor="middle" fill="#059669" font-size="4" font-weight="bold">Nast. kontrola</text>
                                        <text x="50" y="70" text-anchor="middle" fill="#064e3b" font-size="5" font-weight="bold">
                                            ${String(expiry.getMonth() + 1).padStart(2, '0')}/${expiry.getFullYear()}
                                        </text>
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
