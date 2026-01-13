
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tool, ProtocolData } from "@/types";
import { getToolProtocols } from "@/actions/protocols";
import { format } from "date-fns";
import { Eye, Loader2, Pencil } from "lucide-react";
import { ToolProtocolPreviewDialog } from "./ToolProtocolPreviewDialog";
import { ToolProtocolDialog } from "./ToolProtocolDialog";
import { updateProtocol } from "@/actions/protocols";
import { toast } from "sonner";

interface ProtocolHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tool: Tool | null;
}

interface ProtocolRecord {
    id: number;
    date: Date;
    inspectorName: string;
    result: string;
    content: string;
}

export function ProtocolHistoryDialog({ open, onOpenChange, tool }: ProtocolHistoryDialogProps) {
    const [protocols, setProtocols] = useState<ProtocolRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProtocol, setSelectedProtocol] = useState<ProtocolRecord | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        if (open && tool && tool.id) {
            setLoading(true);
            getToolProtocols(tool.id).then(res => {
                if (res.success && res.data) {
                    setProtocols(res.data);
                }
                setLoading(false);
            });
        }
    }, [open, tool]);

    const handleViewProtocol = (protocol: ProtocolRecord) => {
        setSelectedProtocol(protocol);
        setIsPreviewOpen(true);
    };

    const handlePrintOldProtocol = () => {
        setTimeout(() => window.print(), 500);
        setIsPreviewOpen(false);
    };

    const handleEditProtocol = (protocol: ProtocolRecord) => {
        setSelectedProtocol(protocol);
        setIsEditDialogOpen(true);
    };

    const handleUpdateProtocol = async (data: ProtocolData) => {
        if (!selectedProtocol) return;
        const result = await updateProtocol(selectedProtocol.id, data);
        if (result.success) {
            toast.success("Protokół zaktualizowany");
            // Refresh list
            if (tool?.id) {
                const res = await getToolProtocols(tool.id);
                if (res.success && res.data) setProtocols(res.data);
            }
        } else {
            toast.error("Błąd aktualizacji protokołu");
        }
        setIsEditDialogOpen(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Historia Protokołów: {tool?.name} ({tool?.serialNumber})</DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin h-8 w-8" />
                        </div>
                    ) : protocols.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Brak historii protokołów dla tego narzędzia.
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Inspektor</TableHead>
                                        <TableHead>Wynik</TableHead>
                                        <TableHead className="text-right">Akcje</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {protocols.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{format(new Date(p.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{p.inspectorName}</TableCell>
                                            <TableCell className={p.result === 'POZYTYWNA' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                                {p.result}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleViewProtocol(p)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Podgląd
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleEditProtocol(p)}>
                                                    <Pencil className="w-4 h-4 mr-2 text-blue-600" />
                                                    Edytuj
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reusing the Preview Dialog for viewing historical records */}
            {selectedProtocol && tool && (
                <ToolProtocolPreviewDialog
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    data={{
                        tool: tool,
                        protocolData: JSON.parse(selectedProtocol.content) as ProtocolData
                    }}
                    onPrint={handlePrintOldProtocol}
                    onEdit={() => setIsPreviewOpen(false)}
                />
            )}

            {selectedProtocol && tool && (
                <ToolProtocolDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    tool={tool}
                    onSubmit={handleUpdateProtocol}
                    initialProtocolData={JSON.parse(selectedProtocol.content) as ProtocolData}
                />
            )}
        </>
    );
}
