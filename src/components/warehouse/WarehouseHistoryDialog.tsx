import { useEffect, useState } from "react";
import { WarehouseItem, WarehouseHistoryItem } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { getWarehouseHistory } from "@/actions/warehouse";

interface WarehouseHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: WarehouseItem;
}

export function WarehouseHistoryDialog({ open, onOpenChange, item }: WarehouseHistoryDialogProps) {
    const [history, setHistory] = useState<WarehouseHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            if (item?.id && open) {
                setLoading(true);
                try {
                    const data = await getWarehouseHistory(item.id);
                    setHistory(data);
                } catch (error) {
                    console.error("Failed to fetch history:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchHistory();
    }, [item?.id, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Historia operacji: {item?.name}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Typ</TableHead>
                                <TableHead>Ilość</TableHead>
                                <TableHead>Powód / Uwagi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        Ładowanie...
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {history.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-xs">
                                                {format(new Date(entry.date), "dd.MM.yyyy HH:mm", { locale: pl })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {entry.type === 'IN' ? (
                                                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                                                    )}
                                                    <span className={entry.type === 'IN' ? "text-green-600 font-medium" : "text-blue-600 font-medium"}>
                                                        {entry.type === 'IN' ? 'Przyjęcie' : 'Wydanie'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                {entry.quantity} {item?.unit}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {entry.reason || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                Brak historii operacji dla tego przedmiotu
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
