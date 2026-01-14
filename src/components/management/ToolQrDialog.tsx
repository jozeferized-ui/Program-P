'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tool } from '@/types';
import { Download, Printer, QrCode } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface ToolQrDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tool: Tool | null;
}

// Generate initials from assigned employees
function getInitials(assignedEmployees: Array<{ firstName: string; lastName: string }> | undefined): string {
    if (!assignedEmployees || assignedEmployees.length === 0) return '--';
    const emp = assignedEmployees[0];
    const firstInitial = emp.firstName?.[0] || '';
    const lastInitial = emp.lastName?.[0] || '';
    if (firstInitial && lastInitial) {
        return (firstInitial + lastInitial).toUpperCase();
    }
    return '--';
}

// Format tool ID as 4-digit number
function formatToolNumber(id: number | undefined): string {
    return (id || 0).toString().padStart(4, '0');
}

export function ToolQrDialog({ open, onOpenChange, tool }: ToolQrDialogProps) {
    const qrContainerRef = useRef<HTMLDivElement>(null);
    const outputCanvasRef = useRef<HTMLCanvasElement>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [rendered, setRendered] = useState(false);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const toolUrl = tool ? `${origin}/tools/${tool.id || 0}` : '';

    const initials = tool ? getInitials(tool.assignedEmployees) : '--';
    const toolNumber = tool ? formatToolNumber(tool.id) : '0000';
    const brandLabel = `ERIZED/${initials} ${toolNumber}`;

    // Draw overlay on QR code
    const drawOverlay = useCallback(() => {
        const sourceCanvas = qrContainerRef.current?.querySelector('canvas');
        const outputCanvas = outputCanvasRef.current;

        if (!sourceCanvas || !outputCanvas) return;

        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        const size = 280;
        outputCanvas.width = size;
        outputCanvas.height = size;

        // Draw the QR code first
        ctx.drawImage(sourceCanvas, 0, 0, size, size);

        // Now draw the ERIZED overlay in the center
        const labelWidth = size * 0.42;
        const labelHeight = size * 0.25;
        const x = (size - labelWidth) / 2;
        const y = (size - labelHeight) / 2;

        // White background for label
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 6, y - 6, labelWidth + 12, labelHeight + 12);

        // Dark border
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 3, y - 3, labelWidth + 6, labelHeight + 6);

        // ERIZED text
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ERIZED', size / 2, y + labelHeight * 0.25);

        // /Initials text  
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText(`/${initials}`, size / 2, y + labelHeight * 0.52);

        // Tool number
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText(toolNumber, size / 2, y + labelHeight * 0.82);

        // Save as data URL
        setImageUrl(outputCanvas.toDataURL('image/png'));
        setRendered(true);
    }, [initials, toolNumber]);

    // Trigger overlay drawing after QR renders
    useEffect(() => {
        if (!open || !tool) {
            setRendered(false);
            return;
        }

        // Wait for QRCodeCanvas to render, then draw overlay
        const timer = setTimeout(drawOverlay, 200);
        return () => clearTimeout(timer);
    }, [open, tool, drawOverlay]);

    if (!tool) return null;

    const handleDownload = () => {
        if (!imageUrl) return;
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_ERIZED_${initials}_${toolNumber}.png`;
        downloadLink.href = imageUrl;
        downloadLink.click();
    };

    const handlePrint = () => {
        if (!imageUrl) return;

        const printWindow = window.open('', '_blank', 'width=600,height=600');

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Drukuj QR - ${brandLabel}</title>
                        <style>
                            @page { size: auto; margin: 10mm; }
                            body { 
                                display: flex; 
                                flex-direction: column; 
                                align-items: center; 
                                justify-content: center; 
                                height: 100vh; 
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                margin: 0;
                            }
                            .card {
                                border: 3px solid #1a1a2e;
                                padding: 24px;
                                text-align: center;
                                border-radius: 16px;
                                background: #fff;
                            }
                            .qr { margin-bottom: 12px; }
                            .qr img { width: 240px; height: 240px; }
                            .name { font-weight: 800; font-size: 18px; text-transform: uppercase; color: #1a1a2e; margin-bottom: 4px; }
                            .brand { font-weight: 600; font-size: 13px; color: #666; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="qr"><img src="${imageUrl}" alt="QR Code" /></div>
                            <div class="name">${tool.name}</div>
                            <div class="brand">${tool.brand}${tool.model ? ` | ${tool.model}` : ""} | S/N: ${tool.serialNumber}</div>
                        </div>
                        <script>
                            window.onload = () => {
                                setTimeout(() => {
                                    window.print();
                                    window.close();
                                }, 500);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold">Kod QR Narzędzia</DialogTitle>
                    </div>
                    <DialogDescription className="font-medium text-slate-500">
                        Zeskanuj ten kod, aby sprawdzić status i historię narzędzia.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 gap-4 my-4">
                    {/* Hidden QR source */}
                    <div ref={qrContainerRef} className="hidden">
                        <QRCodeCanvas
                            value={toolUrl}
                            size={280}
                            level="H"
                            includeMargin
                            bgColor="#ffffff"
                            fgColor="#1a1a2e"
                        />
                    </div>

                    {/* Visible output with overlay */}
                    <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-slate-100">
                        <canvas
                            ref={outputCanvasRef}
                            width={280}
                            height={280}
                            className="w-[220px] h-[220px]"
                        />
                    </div>

                    <div className="text-center">
                        <p className="font-bold text-lg uppercase text-slate-700">{tool.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{tool.brand}{tool.model ? ` | ${tool.model}` : ""} | S/N: {tool.serialNumber}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 py-6 gap-2 rounded-xl font-bold" disabled={!rendered}>
                        <Download className="w-4 h-4" /> Pobierz
                    </Button>
                    <Button onClick={handlePrint} className="flex-1 py-6 gap-2 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={!rendered}>
                        <Printer className="w-4 h-4" /> Drukuj
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
