'use client';

import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Tool } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QrSheetPrintProps {
    tools: Tool[];
    onClose?: () => void;
}

// Generate initials
function getInitials(employees: Array<{ firstName: string; lastName: string }> | undefined): string {
    if (!employees || employees.length === 0) return '--';
    const emp = employees[0];
    const first = emp.firstName?.[0] || '';
    const last = emp.lastName?.[0] || '';
    return (first + last).toUpperCase() || '--';
}

export function QrSheetPrint({ tools, onClose }: QrSheetPrintProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [format, setFormat] = useState<'A4' | 'A3'>('A4');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // 3cm = 30mm, at 96 DPI: 30mm * 3.78 px/mm ≈ 113px
    // For print at 300 DPI: 30mm = ~354px, but we use CSS mm units
    const qrSizeMm = 30; // 3cm
    const qrSizePx = 100; // Display size

    // A4: 210x297mm, A3: 297x420mm
    // With 10mm margins: A4 = 190x277mm working area
    const pageConfig = {
        A4: { width: 210, height: 297, cols: 6, rows: 9 },
        A3: { width: 297, height: 420, cols: 9, rows: 13 },
    };

    const config = pageConfig[format];
    const codesPerPage = config.cols * config.rows;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="qr-sheet-container">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .qr-print-sheet, .qr-print-sheet * { visibility: visible; }
                    .qr-print-sheet { 
                        position: absolute; 
                        left: 0; 
                        top: 0;
                    }
                    .no-print { display: none !important; }
                    .qr-item {
                        width: ${qrSizeMm}mm !important;
                        height: ${qrSizeMm}mm !important;
                        break-inside: avoid;
                    }
                    @page {
                        size: ${format};
                        margin: 10mm;
                    }
                }
            `}</style>

            <div className="no-print mb-6 flex items-center gap-4 p-4 bg-slate-100 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Format:</span>
                    <Select value={format} onValueChange={(v) => setFormat(v as 'A4' | 'A3')}>
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="A3">A3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    {tools.length} kodów QR • {config.cols}×{config.rows} = {codesPerPage} na stronę • 3×3cm
                </div>
                <div className="flex-1" />
                <Button onClick={handlePrint} className="font-bold">
                    Drukuj
                </Button>
                {onClose && (
                    <Button variant="outline" onClick={onClose}>
                        Zamknij
                    </Button>
                )}
            </div>

            <div
                ref={containerRef}
                className="qr-print-sheet bg-white p-4 rounded-xl border"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${config.cols}, ${qrSizePx}px)`,
                    gap: '8px',
                }}
            >
                {tools.map((tool) => {
                    const toolUrl = `${origin}/tools/${tool.id}`;
                    const initials = getInitials(tool.assignedEmployees);
                    const toolNumber = String(tool.id || 0).padStart(4, '0');
                    const label = `ERIZED/${initials} ${toolNumber}`;

                    return (
                        <div
                            key={tool.id}
                            className="qr-item flex flex-col items-center justify-center p-1 border border-dashed border-slate-200 rounded"
                            style={{ width: qrSizePx, height: qrSizePx }}
                        >
                            <QRCodeCanvas
                                value={toolUrl}
                                size={qrSizePx - 24}
                                level="H"
                                bgColor="#ffffff"
                                fgColor="#1a1a2e"
                            />
                            <span className="text-[7px] font-bold mt-0.5 truncate max-w-full text-center">
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
