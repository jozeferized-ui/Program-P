
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToolProtocolPdf } from "./ToolProtocolPdf";
import { Tool, Employee, ProtocolData } from "@/types";
import { Printer, ArrowLeft } from "lucide-react";

interface ToolProtocolPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: { tool: Tool, inspector?: Employee, protocolData: ProtocolData } | null;
    onPrint: () => void;
    onEdit: () => void;
}

export function ToolProtocolPreviewDialog({ open, onOpenChange, data, onPrint, onEdit }: ToolProtocolPreviewDialogProps) {
    if (!data) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Podgląd Protokołu</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center">
                    <div className="shadow-lg bg-white">
                        <div className="scale-75 origin-top sm:scale-100">
                            <ToolProtocolPdf
                                tool={data.tool}
                                inspector={data.inspector}
                                protocolData={data.protocolData}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-white">
                    <div className="flex justify-between w-full">
                        <Button variant="outline" onClick={onEdit}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Wróć do edycji
                        </Button>
                        <Button onClick={onPrint} className="gap-2">
                            <Printer className="w-4 h-4" />
                            Drukuj (Zatwierdź)
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
