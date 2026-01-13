'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tool } from '@/types';
import { Download, Printer, QrCode } from 'lucide-react';
import { useRef } from 'react';

interface ToolQrDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tool: Tool | null;
}

export function ToolQrDialog({ open, onOpenChange, tool }: ToolQrDialogProps) {
    if (!tool) return null;

    const qrRef = useRef<HTMLDivElement>(null);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const toolUrl = `${origin}/tools/${tool.id}`;

    const handleDownload = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `QR_${tool.name}_${tool.serialNumber}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handlePrint = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;
        const svgHtml = svg.outerHTML;

        const printWindow = window.open('', '_blank', 'width=600,height=600');

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Drukuj QR - ${tool.name}</title>
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
                                border: 2px solid #000;
                                padding: 20px;
                                text-align: center;
                                border-radius: 10px;
                            }
                            .qr { margin-bottom: 20px; }
                            .name { font-weight: 900; font-size: 24px; text-transform: uppercase; margin-bottom: 4px; }
                            .brand { font-weight: 700; font-size: 14px; color: #333; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
                            .sn { font-size: 12px; font-weight: bold; color: #666; }
                            svg { width: 250px; height: 250px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div class="qr">${svgHtml}</div>
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
                        Zeskanuj ten kod, aby błyskawicznie sprawdzić status i historię narzędzia na budowie.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 gap-6 my-4 shadow-inner">
                    <div ref={qrRef} className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-white ring-1 ring-slate-200">
                        <QRCodeSVG value={toolUrl} size={180} level="H" includeMargin />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-xl uppercase tracking-tight text-slate-900 leading-tight">{tool.name}</p>
                        <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-2">{tool.brand}{tool.model ? ` | ${tool.model}` : ""} | {tool.serialNumber}</p>
                        <code className="text-[10px] bg-slate-200 px-2 py-1 rounded-md text-slate-600 break-all">{toolUrl}</code>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 py-6 gap-2 rounded-xl font-bold hover:bg-slate-50">
                        <Download className="w-4 h-4" /> Pobierz Obraz
                    </Button>
                    <Button onClick={handlePrint} className="flex-1 py-6 gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
                        <Printer className="w-4 h-4" /> Drukuj Etykietę
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
