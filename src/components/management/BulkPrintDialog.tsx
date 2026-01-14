'use client';

import { useState } from 'react';
import { Tool } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, FileText, Tag, Printer } from 'lucide-react';
import { QrSheetPrint } from './QrSheetPrint';
import { InspectionSticker, StickerSheet } from './InspectionSticker';

interface BulkPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTools: Tool[];
}

type PrintMode = 'select' | 'qr' | 'stickers' | 'protocols';

export function BulkPrintDialog({ open, onOpenChange, selectedTools }: BulkPrintDialogProps) {
    const [mode, setMode] = useState<PrintMode>('select');

    const handleClose = () => {
        setMode('select');
        onOpenChange(false);
    };

    // Prepare sticker data from tools
    const stickerData = selectedTools.map(tool => {
        const lastInsp = tool.lastInspectionDate ? new Date(tool.lastInspectionDate) : new Date();
        const expiry = tool.inspectionExpiryDate ? new Date(tool.inspectionExpiryDate) : new Date(lastInsp.getTime() + 365 * 24 * 60 * 60 * 1000);

        return {
            serialNumber: tool.serialNumber || '-',
            model: tool.model || tool.brand || tool.name,
            brand: tool.brand,
            inspectionMonth: lastInsp.getMonth() + 1,
            inspectionYear: lastInsp.getFullYear(),
            expiryMonth: expiry.getMonth() + 1,
            expiryYear: expiry.getFullYear(),
        };
    });

    // Print protocols - redirect to each protocol
    const handlePrintProtocols = () => {
        const toolsWithProtocols = selectedTools.filter(t => (t as any).protocols?.length > 0);
        if (toolsWithProtocols.length === 0) {
            alert('Żadne z zaznaczonych narzędzi nie ma protokołów');
            return;
        }

        // Open print window with all protocols
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        let protocolsHtml = '';
        toolsWithProtocols.forEach(tool => {
            const protocols = (tool as any).protocols || [];
            protocols.forEach((protocol: any) => {
                protocolsHtml += `
                    <div class="protocol-page" style="page-break-after: always; padding: 20px; font-family: Arial, sans-serif;">
                        <h1 style="text-align: center; font-size: 18px; margin-bottom: 20px;">PROTOKÓŁ PRZEGLĄDU NARZĘDZIA</h1>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; width: 30%; font-weight: bold;">Narzędzie:</td>
                                <td style="border: 1px solid #000; padding: 8px;">${tool.name}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Marka / Model:</td>
                                <td style="border: 1px solid #000; padding: 8px;">${tool.brand || '-'} ${tool.model || ''}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Numer seryjny:</td>
                                <td style="border: 1px solid #000; padding: 8px;">${tool.serialNumber}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Data przeglądu:</td>
                                <td style="border: 1px solid #000; padding: 8px;">${new Date(protocol.date).toLocaleDateString('pl-PL')}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Inspektor:</td>
                                <td style="border: 1px solid #000; padding: 8px;">${protocol.inspectorName}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Wynik:</td>
                                <td style="border: 1px solid #000; padding: 8px; ${protocol.result === 'POZYTYWNA' ? 'color: green;' : 'color: red;'} font-weight: bold;">${protocol.result}</td>
                            </tr>
                        </table>
                        <div style="border: 1px solid #000; padding: 10px; min-height: 100px;">
                            <strong>Treść protokołu:</strong><br/>
                            ${protocol.content || '-'}
                        </div>
                        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                            <div style="width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center;">
                                Podpis inspektora
                            </div>
                            <div style="width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center;">
                                Data
                            </div>
                        </div>
                    </div>
                `;
            });
        });

        printWindow.document.write(`
            <html>
                <head><title>Protokoły przeglądów</title></head>
                <body>${protocolsHtml}</body>
                <script>
                    window.onload = () => {
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    };
                </script>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={mode === 'select' ? 'max-w-md' : 'max-w-4xl max-h-[90vh] overflow-auto'}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Drukowanie zbiorcze ({selectedTools.length} narzędzi)
                    </DialogTitle>
                </DialogHeader>

                {mode === 'select' && (
                    <div className="grid grid-cols-1 gap-3 py-4">
                        <Button
                            variant="outline"
                            className="h-20 flex items-center justify-start gap-4 px-6"
                            onClick={() => setMode('qr')}
                        >
                            <QrCode className="w-8 h-8 text-primary" />
                            <div className="text-left">
                                <div className="font-bold">Kody QR</div>
                                <div className="text-sm text-muted-foreground">Arkusz 3×3cm na A4 lub A3</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-20 flex items-center justify-start gap-4 px-6"
                            onClick={() => setMode('stickers')}
                        >
                            <Tag className="w-8 h-8 text-emerald-600" />
                            <div className="text-left">
                                <div className="font-bold">Naklejki kontrolne</div>
                                <div className="text-sm text-muted-foreground">Z datą kontroli i ważności</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-20 flex items-center justify-start gap-4 px-6"
                            onClick={handlePrintProtocols}
                        >
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div className="text-left">
                                <div className="font-bold">Protokoły przeglądów</div>
                                <div className="text-sm text-muted-foreground">Wszystkie protokoły zaznaczonych</div>
                            </div>
                        </Button>
                    </div>
                )}

                {mode === 'qr' && (
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="mb-4">
                            ← Wróć
                        </Button>
                        <QrSheetPrint tools={selectedTools} />
                    </div>
                )}

                {mode === 'stickers' && (
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="mb-4">
                            ← Wróć
                        </Button>
                        <StickerSheet tools={stickerData} stickerSize={30} format="A4" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
