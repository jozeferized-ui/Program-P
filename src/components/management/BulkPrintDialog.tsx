'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Tool, Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Printer, User, QrCode, Tag, FileText } from 'lucide-react';
import QRCode from 'qrcode';

interface BulkPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTools: Tool[];
    allTools?: Tool[];
    allEmployees?: Employee[];
}

// Get initials for QR label
function getInitials(employees: Array<{ firstName: string; lastName: string }> | undefined): string {
    if (!employees || employees.length === 0) return '--';
    const emp = employees[0];
    return ((emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')).toUpperCase() || '--';
}

export function BulkPrintDialog({ open, onOpenChange, selectedTools, allTools = [], allEmployees = [] }: BulkPrintDialogProps) {
    const [employeeFilter, setEmployeeFilter] = useState<string>('selected');
    const [showQr, setShowQr] = useState(true);
    const [showSticker, setShowSticker] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [printProtocols, setPrintProtocols] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Get unique employees from ALL tools
    const toolEmployees = useMemo(() => {
        const empMap = new Map<number, Employee>();
        allTools.forEach(tool => {
            (tool.assignedEmployees || []).forEach((emp: any) => {
                if (emp.id && !empMap.has(emp.id)) {
                    empMap.set(emp.id, emp);
                }
            });
        });
        return Array.from(empMap.values());
    }, [allTools]);

    // Filter tools based on selection mode
    const filteredTools = useMemo(() => {
        if (employeeFilter === 'selected') {
            return selectedTools; // Only manually selected tools
        }
        // Filter all tools by employee
        const empId = parseInt(employeeFilter);
        return allTools.filter(tool =>
            (tool.assignedEmployees || []).some((e: any) => e.id === empId)
        );
    }, [selectedTools, allTools, employeeFilter]);


    const handlePrint = async () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        // Pre-generate QR codes as data URLs
        const qrDataUrls = new Map<number, string>();
        for (const tool of filteredTools) {
            if (showQr && tool.id) {
                try {
                    const url = `${origin}/tools/${tool.id}`;
                    const dataUrl = await QRCode.toDataURL(url, {
                        width: 100,
                        margin: 1,
                        errorCorrectionLevel: 'H'
                    });
                    qrDataUrls.set(tool.id, dataUrl);
                } catch (e) {
                    console.error('QR generation error:', e);
                }
            }
        }

        let cardsHtml = '';

        // Tool cards
        if (showQr || showSticker || showInfo) {
            filteredTools.forEach(tool => {
                const lastInsp = tool.lastInspectionDate ? new Date(tool.lastInspectionDate) : null;
                const expiry = tool.inspectionExpiryDate ? new Date(tool.inspectionExpiryDate) : null;
                const initials = getInitials(tool.assignedEmployees);
                const toolNumber = String(tool.id || 0).padStart(4, '0');
                const qrDataUrl = qrDataUrls.get(tool.id!) || '';

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
                            ${showQr && qrDataUrl ? `
                                <div style="text-align: center; position: relative;">
                                    <div style="position: relative; width: 100px; height: 100px;">
                                        <img src="${qrDataUrl}" width="100" height="100" style="display: block;"/>
                                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2px 6px; border: 1px solid #1a1a2e; font-size: 7px; text-align: center; line-height: 1.3;">
                                            <div style="font-weight: bold;">ERIZED</div>
                                            <div>/${initials}</div>
                                            <div style="font-weight: bold; font-size: 9px;">${toolNumber}</div>
                                        </div>
                                    </div>
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


        // Protocols - matching ToolProtocolPdf format
        let protocolsHtml = '';
        if (printProtocols) {
            filteredTools.forEach(tool => {
                const protocols = (tool as any).protocols || [];
                const toolUrl = `${origin}/tools/${tool.id || 0}`;
                const initials = getInitials(tool.assignedEmployees);
                const toolNumber = String(tool.id || 0).padStart(4, '0');

                protocols.forEach((protocol: any) => {
                    // Parse protocol content if it's JSON
                    let protocolData: any = {};
                    try {
                        if (protocol.content && protocol.content.startsWith('{')) {
                            protocolData = JSON.parse(protocol.content);
                        }
                    } catch (e) {
                        protocolData = {};
                    }

                    const formatDate = (d: any) => {
                        if (!d) return '....................';
                        return new Date(d).toLocaleDateString('pl-PL');
                    };

                    const general = protocolData.general || { a: '-', b: '-', c: '-', d: '-' };
                    const disassembly = protocolData.disassembly || { a: '-', b: '-', c: '-', d: '-' };
                    const protection = protocolData.protection || { a: '-', b: '-' };

                    protocolsHtml += `
                        <div class="protocol-page" style="page-break-after: always; font-family: Arial, sans-serif; font-size: 11px;">
                            <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
                                <!-- Header -->
                                <tr>
                                    <td colspan="2" style="border: 1px solid black; padding: 8px; background: #e5e5e5; font-weight: bold;">
                                        PROTOKÓŁ NR ${tool.protocolNumber || '...'} GOTOWY<br/>
                                        NR DO NASTĘPNEGO PRZEGLĄDU
                                    </td>
                                    <td colspan="2" style="border: 1px solid black; padding: 8px; background: #e5e5e5;"></td>
                                </tr>
                                <!-- Title -->
                                <tr>
                                    <td colspan="4" style="border: 1px solid black; padding: 8px; background: #e5e5e5; text-align: center; font-weight: bold; font-size: 13px;">
                                        BADANIE ELEKTRONARZĘDZI O NAPĘDZIE ELEKTRYCZNYM
                                    </td>
                                </tr>
                                <!-- Device info -->
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold; width: 150px;">RODZAJ POMIARÓW</td>
                                    <td colspan="3" style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">OKRESOWY PRZEGLĄD</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">RODZAJ PRZYRZĄDU</td>
                                    <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; text-transform: uppercase;">${tool.name}</td>
                                    <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">${tool.brand || ''} ${tool.model || ''}</td>
                                    <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">NR ${tool.serialNumber}</td>
                                </tr>
                                <!-- Dates -->
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">DATA</td>
                                    <td style="border: 1px solid black; padding: 4px;">
                                        <div style="font-size: 9px; background: #f0f0f0; padding: 2px; font-weight: bold;">DATA BIEŻĄCYCH BADAŃ</div>
                                        <div style="text-align: center; font-size: 16px; font-weight: bold; padding: 4px;">${formatDate(protocolData.date || protocol.date)}</div>
                                    </td>
                                    <td colspan="2" style="border: 1px solid black; padding: 4px;">
                                        <div style="font-size: 9px; background: #f0f0f0; padding: 2px; font-weight: bold;">DATA NASTĘPNYCH BADAŃ</div>
                                        <div style="text-align: center; font-size: 16px; padding: 4px;">${formatDate(protocolData.nextInspectionDate || tool.inspectionExpiryDate)}</div>
                                    </td>
                                </tr>
                                <!-- Inspector -->
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">POMIAR WYKONAŁ</td>
                                    <td colspan="3" style="border: 1px solid black; padding: 6px; font-weight: bold;">${protocolData.inspectorName || protocol.inspectorName || ''}</td>
                                </tr>
                                <!-- Conditions -->
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">WARUNKI Z POMIARÓW</td>
                                    <td colspan="3" style="border: 1px solid black; padding: 6px;">${protocolData.comments || ''}</td>
                                </tr>
                                <!-- Section 1: Stan Ogólny -->
                                <tr>
                                    <td rowspan="4" style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold; text-align: center; vertical-align: middle;">SPRAWDZONO STAN OGÓLNY</td>
                                    <td style="border: 1px solid black; padding: 4px; width: 30px;">a.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Czy obudowa, przewód przyłączeniowy, wtyczka są nieuszkodzone</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 100px;">${general.a}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">b.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Uchwyty, zaciski części roboczych są kompletne</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${general.b}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">c.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Kontrola wycieku smaru</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${general.c}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">d.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Sprawdzenie biegu jałowego</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${general.d}</td>
                                </tr>
                                <!-- Section 2: Demontaż -->
                                <tr>
                                    <td rowspan="4" style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold; text-align: center; vertical-align: middle; font-size: 9px;">PRZEPROWADZONO DEMONTAŻ I OGLĘDZINY</td>
                                    <td style="border: 1px solid black; padding: 4px;">a.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Przewód przyłączeniowy jest dobrze przymocowany i podłączony</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${disassembly.a}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">b.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Połączenia wewnętrzne są nieuszkodzone</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${disassembly.b}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">c.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Komutator i szczotki nie są zużyte</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${disassembly.c}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">d.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Elementy mechaniczne są nasmarowane</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${disassembly.d}</td>
                                </tr>
                                <!-- Section 3: Obwód ochronny -->
                                <tr>
                                    <td rowspan="2" style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold; text-align: center; vertical-align: middle; font-size: 10px;">SPRAWDZENIE OBWODU OCHRONNEGO</td>
                                    <td style="border: 1px solid black; padding: 4px;">a.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Przewód PE jest dobrze podpięty</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${protection.a}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid black; padding: 4px;">b.</td>
                                    <td style="border: 1px solid black; padding: 4px;">Pomierzono spadek napięcia</td>
                                    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${protection.b}</td>
                                </tr>
                                <!-- Final result -->
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">OCENA KOŃCOWA</td>
                                    <td colspan="3" style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold; font-size: 16px; ${(protocolData.result || protocol.result) === 'POZYTYWNA' ? 'color: green;' : 'color: red;'}">
                                        ${protocolData.result || protocol.result || '-'}
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">MIEJSCE I DATA</td>
                                    <td style="border: 1px solid black; padding: 6px; font-weight: bold;">${protocolData.place || ''} ${formatDate(protocolData.date || protocol.date)}</td>
                                    <td style="border: 1px solid black; padding: 6px; background: #f0f0f0; font-weight: bold;">PODPIS</td>
                                    <td style="border: 1px solid black; padding: 6px;"></td>
                                </tr>
                            </table>
                            <!-- Small QR at bottom -->
                            <div style="margin-top: 15px; text-align: right;">
                                <div style="display: inline-block; position: relative;">
                                    <img src="${qrDataUrls.get(tool.id!) || ''}" width="60" height="60" style="display: block;"/>
                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 1px 4px; border: 1px solid #1a1a2e; font-size: 5px; text-align: center; line-height: 1.2;">
                                        <div style="font-weight: bold;">ERIZED</div>
                                        <div>/${initials}</div>
                                        <div style="font-weight: bold; font-size: 6px;">${toolNumber}</div>
                                    </div>
                                </div>
                                <p style="font-size: 8px; margin: 4px 0 0 0;">ERIZED/${initials} ${toolNumber}</p>
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
                        @page { margin: 10mm; }
                        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
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
                <\/script>
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
                                <SelectItem value="selected">Zaznaczone ({selectedTools.length} narzędzi)</SelectItem>
                                {toolEmployees.map(emp => {
                                    const count = allTools.filter(t =>
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
                                <span className="text-sm text-muted-foreground block">
                                    Dostępne: {filteredTools.reduce((sum, t) => sum + ((t as any).protocols?.length || 0), 0)} protokołów
                                    {filteredTools.filter(t => !((t as any).protocols?.length)).length > 0 &&
                                        ` (${filteredTools.filter(t => !((t as any).protocols?.length)).length} narzędzi bez protokołu)`
                                    }
                                </span>
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
