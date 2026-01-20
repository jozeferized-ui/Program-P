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

        // Pre-generate QR codes as data URLs with overlay (matching ToolQrDialog style)
        const qrDataUrls = new Map<number, string>();
        for (const tool of filteredTools) {
            if (showQr && tool.id) {
                try {
                    const url = `${origin}/tools/${tool.id}`;
                    const initials = getInitials(tool.assignedEmployees);
                    const toolNumber = String(tool.id || 0).padStart(4, '0');

                    // Generate base QR code at high resolution for print quality
                    const baseQrDataUrl = await QRCode.toDataURL(url, {
                        width: 560,
                        margin: 2,
                        errorCorrectionLevel: 'H',
                        color: {
                            dark: '#1a1a2e',
                            light: '#ffffff'
                        }
                    });

                    // Create canvas to add overlay
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const size = 560; // High resolution for print quality
                    canvas.width = size;
                    canvas.height = size;

                    if (ctx) {
                        // Load and draw the base QR code
                        const img = new Image();
                        img.src = baseQrDataUrl;
                        await new Promise((resolve) => {
                            img.onload = resolve;
                        });
                        ctx.drawImage(img, 0, 0, size, size);

                        // Draw overlay with initials and tool number (matching ToolQrDialog)
                        const labelWidth = size * 0.22;
                        const labelHeight = size * 0.12;
                        const x = (size - labelWidth) / 2;
                        const y = (size - labelHeight) / 2;

                        // White background for label
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(x - 6, y - 6, labelWidth + 12, labelHeight + 12);

                        // Initials (smaller, above) - scaled for high res
                        ctx.fillStyle = '#1a1a2e';
                        ctx.font = 'bold 24px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(initials, size / 2, y + labelHeight * 0.35);

                        // Tool number (larger, below) - scaled for high res
                        ctx.font = 'bold 32px Arial, sans-serif';
                        ctx.fillText(toolNumber, size / 2, y + labelHeight * 0.75);

                        qrDataUrls.set(tool.id, canvas.toDataURL('image/png'));
                    }
                } catch (e) {
                    // Error handling without console.log
                }
            }
        }

        let cardsHtml = '';

        // Determine if we're in grid mode (no info, just QR and/or stickers)
        const gridMode = !showInfo && (showQr || showSticker);

        // Tool cards
        if (showQr || showSticker || showInfo) {
            // Grid container for compact QR/sticker only mode
            if (gridMode) {
                cardsHtml += `<div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start;">`;
            }

            filteredTools.forEach(tool => {
                const lastInsp = tool.lastInspectionDate ? new Date(tool.lastInspectionDate) : null;
                const expiry = tool.inspectionExpiryDate ? new Date(tool.inspectionExpiryDate) : null;
                const initials = getInitials(tool.assignedEmployees);
                const toolNumber = String(tool.id || 0).padStart(4, '0');
                const qrDataUrl = qrDataUrls.get(tool.id!) || '';

                // Format dates
                const lastInspStr = lastInsp ? lastInsp.toLocaleDateString('pl-PL') : '-';
                const expiryStr = expiry ? expiry.toLocaleDateString('pl-PL') : '-';
                const deviceName = (tool.name || '-').substring(0, 25);
                const serialNum = (tool.serialNumber || '-').substring(0, 18);

                // Sticker name priority: Model > Brand > Name
                const stickerName = (tool.model || tool.brand || tool.name || '-');

                if (gridMode) {

                    // Compact grid items - just QR and/or sticker side by side
                    cardsHtml += `
                        <div style="display: flex; gap: 2px; page-break-inside: avoid;">
                            ${showQr && qrDataUrl ? `
                                <div style="text-align: center;">
                                    <img src="${qrDataUrl}" width="55" height="55" style="display: block;"/>
                                </div>
                            ` : ''}
                            
                            ${showSticker ? `
                                <svg width="55" height="55" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="48" fill="#059669" stroke="#064e3b" stroke-width="1"/>
                                    <circle cx="50" cy="50" r="40" fill="#e6f7f0" stroke="#064e3b" stroke-width="0.5"/>
                                    <text x="50" y="52" text-anchor="middle" fill="rgba(5, 150, 105, 0.12)" font-size="14" font-weight="bold" transform="rotate(-25, 50, 50)">ERIZED</text>
                                    <text x="50" y="17" text-anchor="middle" fill="#000" font-size="5" font-weight="bold">KONTROLA</text>
                                    <text x="50" y="27" text-anchor="middle" fill="#059669" font-size="4" font-weight="bold">${stickerName.substring(0, 14)}</text>
                                    <text x="50" y="35" text-anchor="middle" fill="#000" font-size="3">S/N: ${serialNum.substring(0, 12)}</text>
                                    <line x1="15" y1="39" x2="85" y2="39" stroke="#059669" stroke-width="0.5"/>
                                    <text x="50" y="47" text-anchor="middle" fill="#000" font-size="4" font-weight="bold">Przegląd:</text>
                                    <text x="50" y="56" text-anchor="middle" fill="#000" font-size="5" font-weight="bold">${lastInspStr}</text>
                                    <line x1="15" y1="61" x2="85" y2="61" stroke="#059669" stroke-width="0.5"/>
                                    <text x="50" y="70" text-anchor="middle" fill="#000" font-size="4" font-weight="bold">Ważna do:</text>
                                    <text x="50" y="82" text-anchor="middle" fill="#000" font-size="6" font-weight="bold">${expiryStr}</text>
                                </svg>
                            ` : ''}
                        </div>
                    `;
                } else {
                    // Full card with info
                    cardsHtml += `
                        <div class="tool-card" style="page-break-inside: avoid; border: 1.5px solid #059669; border-radius: 8px; padding: 10px; margin-bottom: 8px; font-family: Arial, sans-serif; display: flex; align-items: center; gap: 12px;">
                            ${showInfo ? `
                                <div style="flex: 1; min-width: 0;">
                                    <h3 style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tool.name}</h3>
                                    <p style="margin: 0; font-size: 10px; color: #666;">
                                        ${tool.brand || ''} ${tool.model ? `| ${tool.model}` : ''} | <strong>S/N: ${tool.serialNumber}</strong>
                                    </p>
                                    <p style="margin: 2px 0 0 0; font-size: 9px; color: #059669; font-weight: bold;">
                                        ${(tool.assignedEmployees || []).map((e: any) => `${e.firstName} ${e.lastName}`).join(', ') || '-'}
                                    </p>
                                </div>
                            ` : ''}
                            
                            <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                                ${showQr && qrDataUrl ? `
                                    <div style="text-align: center;">
                                        <img src="${qrDataUrl}" width="70" height="70" style="display: block;"/>
                                    </div>
                                ` : ''}
                                
                                ${showSticker ? `
                                    <svg width="70" height="70" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="48" fill="#059669" stroke="#064e3b" stroke-width="1"/>
                                        <circle cx="50" cy="50" r="40" fill="#e6f7f0" stroke="#064e3b" stroke-width="0.5"/>
                                        <text x="50" y="52" text-anchor="middle" fill="rgba(5, 150, 105, 0.12)" font-size="14" font-weight="bold" transform="rotate(-25, 50, 50)">ERIZED</text>
                                        <text x="50" y="18" text-anchor="middle" fill="#000" font-size="5" font-weight="bold">KONTROLA</text>
                                        <text x="50" y="28" text-anchor="middle" fill="#059669" font-size="4" font-weight="bold">${stickerName.substring(0, 18)}</text>
                                        <text x="50" y="36" text-anchor="middle" fill="#000" font-size="3.5">S/N: ${serialNum}</text>
                                        <line x1="15" y1="40" x2="85" y2="40" stroke="#059669" stroke-width="0.5"/>
                                        <text x="50" y="48" text-anchor="middle" fill="#000" font-size="4" font-weight="bold">Przegląd:</text>
                                        <text x="50" y="57" text-anchor="middle" fill="#000" font-size="5" font-weight="bold">${lastInspStr}</text>
                                        <line x1="15" y1="62" x2="85" y2="62" stroke="#059669" stroke-width="0.5"/>
                                        <text x="50" y="71" text-anchor="middle" fill="#000" font-size="4" font-weight="bold">Ważna do:</text>
                                        <text x="50" y="82" text-anchor="middle" fill="#000" font-size="6" font-weight="bold">${expiryStr}</text>
                                    </svg>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }
            });

            if (gridMode) {
                cardsHtml += `</div>`;
            }
        }




        // Protocols - matching ToolProtocolPdf format
        let protocolsHtml = '';
        if (printProtocols) {
            filteredTools.forEach(tool => {
                const protocols = (tool as any).protocols || [];
                const toolUrl = `${origin}/tools/${tool.id}`;
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
