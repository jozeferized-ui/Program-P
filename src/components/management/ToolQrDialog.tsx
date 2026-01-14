'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tool } from '@/types';
import { Download, Printer, QrCode } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

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
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const toolUrl = tool ? `${origin}/tools/${tool.id || 0}` : '';

    const initials = tool ? getInitials(tool.assignedEmployees) : '--';
    const toolNumber = tool ? formatToolNumber(tool.id) : '0000';
    const brandLabel = `ERIZED/${initials} ${toolNumber}`;

    useEffect(() => {
        if (!open || !tool || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 280;
        canvas.width = size;
        canvas.height = size;

        // Generate QR code with high error correction
        QRCode.toCanvas(canvas, toolUrl, {
            width: size,
            margin: 2,
            errorCorrectionLevel: 'H', // High - allows 30% damage
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        }, (error) => {
            if (error) {
                console.error('QR generation error:', error);
                return;
            }

            // Draw ERIZED branding overlay in the center
            const labelWidth = 100;
            const labelHeight = 50;
            const x = (size - labelWidth) / 2;
            const y = (size - labelHeight) / 2;

            // White background with slight padding
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 4, y - 4, labelWidth + 8, labelHeight + 8);

            // Border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2, labelWidth + 4, labelHeight + 4);

            // ERIZED text
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 14px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ERIZED', size / 2, y + 12);

            // /Initials text
            ctx.font = 'bold 12px Arial, sans-serif';
            ctx.fillText(`/${initials}`, size / 2, y + 28);

            // Number
            ctx.font = 'bold 16px Arial, sans-serif';
            ctx.fillText(toolNumber, size / 2, y + 44);

            // Save as data URL for download/print
            setCanvasDataUrl(canvas.toDataURL('image/png'));
        });
    }, [open, tool, toolUrl, initials, toolNumber]);

    if (!tool) return null;

    const handleDownload = () => {
        if (!canvasDataUrl) return;
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_ERIZED_${initials}_${toolNumber}.png`;
        downloadLink.href = canvasDataUrl;
        downloadLink.click();
    };

    const handlePrint = () => {
        if (!canvasDataUrl) return;

        const printWindow = window.open('', '_blank', 'width=600,height=600');

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Drukuj QR - ${brandLabel}</title>
                        <style>
                            @page { size: auto; margin: 0mm; }
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
                                border: 3px solid #000;
                                padding: 20px;
                                text-align: center;
                                border-radius: 12px;
                            }
                            .qr { margin-bottom: 16px; }
                            .qr img { width: 200px; height: 200px; }
                            .name { font-weight: 900; font-size: 18px; text-transform: uppercase; margin-bottom: 4px; }
                            .brand { font-weight: 700; font-size: 14px; color: #333; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
                            .sn { font-size: 11px; font-weight: bold; color: #666; }
                            .erized { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin-top: 8px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="qr"><img src="${canvasDataUrl}" alt="QR Code" /></div>
                            <div class="erized">${brandLabel}</div>
                            <div class="name">${tool.name}</div>
                            <div class="brand">${tool.brand}${tool.model ? ` ${tool.model}` : ""}</div>
                            <div class="sn">S/N: ${tool.serialNumber}</div>
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
                    <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-slate-100">
                        <canvas ref={canvasRef} className="w-[200px] h-[200px]" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-2xl tracking-wider text-slate-900">{brandLabel}</p>
                        <p className="font-bold text-lg uppercase text-slate-700 mt-1">{tool.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{tool.brand}{tool.model ? ` | ${tool.model}` : ""} | S/N: {tool.serialNumber}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 py-6 gap-2 rounded-xl font-bold">
                        <Download className="w-4 h-4" /> Pobierz
                    </Button>
                    <Button onClick={handlePrint} className="flex-1 py-6 gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                        <Printer className="w-4 h-4" /> Drukuj
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
