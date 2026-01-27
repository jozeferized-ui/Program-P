"use client";

import { useState, useEffect } from "react";
import { WarehouseItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, AlertTriangle, ArrowDownCircle, ArrowUpCircle, History, Check } from "lucide-react";
import { AddWarehouseItemDialog } from "./AddWarehouseItemDialog";
import { StockOperationDialog } from "./StockOperationDialog";
import { WarehouseHistoryDialog } from "./WarehouseHistoryDialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { createWarehouseItem, updateWarehouseItem, deleteWarehouseItem, createWarehouseHistory } from "@/actions/warehouse";
import { updateOrder } from "@/actions/orders";

interface WarehouseManagerProps {
    initialItems: WarehouseItem[];
    initialOrders: any[]; // Extended Order type with project and supplier names
}

export function WarehouseManager({ initialItems, initialOrders }: WarehouseManagerProps) {
    const [items, setItems] = useState<WarehouseItem[]>(initialItems);
    const [orders, setOrders] = useState<any[]>(initialOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<WarehouseItem | undefined>(undefined);

    // Stock Operation State
    const [stockDialogOpen, setStockDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WarehouseItem | undefined>(undefined);
    const [operationType, setOperationType] = useState<'IN' | 'OUT'>('IN');

    // History Dialog State
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<WarehouseItem | undefined>(undefined);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOrders = orders.filter(order =>
        order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddItem = async (data: any) => {
        try {
            if (editingItem) {
                const updatedItem = await updateWarehouseItem(editingItem.id!, data);
                setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
                toast.success("Zaktualizowano przedmiot");
            } else {
                const newItem = await createWarehouseItem(data);
                setItems(prev => [newItem, ...prev]);
                toast.success("Dodano nowy przedmiot");
            }
            setEditingItem(undefined);
        } catch (error) {
            console.error("Failed to save item:", error);
            toast.error("Wystąpił błąd podczas zapisywania");
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (confirm("Czy na pewno chcesz usunąć ten przedmiot?")) {
            try {
                await deleteWarehouseItem(id);
                setItems(prev => prev.filter(item => item.id !== id));
                toast.success("Usunięto przedmiot");
            } catch (error) {
                console.error("Failed to delete item:", error);
                toast.error("Wystąpił błąd podczas usuwania");
            }
        }
    };

    const handleEditClick = (item: WarehouseItem) => {
        setEditingItem(item);
        setIsAddDialogOpen(true);
    };

    const openStockDialog = (item: WarehouseItem, type: 'IN' | 'OUT') => {
        setSelectedItem(item);
        setOperationType(type);
        setStockDialogOpen(true);
    };

    const openHistoryDialog = (item: WarehouseItem) => {
        setHistoryItem(item);
        setHistoryDialogOpen(true);
    };

    const handleStockOperation = async (itemId: number, quantity: number, type: 'IN' | 'OUT', reason?: string) => {
        try {
            const item = items.find(i => i.id === itemId);
            if (!item) return;

            let newQuantity = item.quantity;
            if (type === 'IN') {
                newQuantity += quantity;
            } else {
                if (item.quantity < quantity) {
                    toast.error("Niewystarczająca ilość w magazynie!");
                    return;
                }
                newQuantity -= quantity;
            }

            // Optimistic update
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));

            await updateWarehouseItem(itemId, { quantity: newQuantity });
            await createWarehouseHistory({
                itemId: itemId,
                type: type,
                quantity: quantity,
                date: new Date(),
                reason: reason
            });

            toast.success(type === 'IN' ? `Przyjęto ${quantity} ${item.unit}` : `Wydano ${quantity} ${item.unit}`);
        } catch (error) {
            console.error("Stock operation failed:", error);
            toast.error("Błąd operacji magazynowej");
            // Revert optimistic update (simplified, ideally fetch fresh data)
        }
    };

    const addToWarehouse = async (order: any) => {
        if (order.addedToWarehouse) {
            toast.error("To zamówienie zostało już dodane do magazynu");
            return;
        }

        try {
            const quantity = order.quantity || 1;
            const unit = order.unit || 'szt.';

            // Check if item exists in warehouse (client-side check for now, ideally server-side)
            const existingItem = items.find(i => i.name === order.title);

            if (existingItem) {
                // Update existing item
                const newQuantity = existingItem.quantity + quantity;
                await updateWarehouseItem(existingItem.id!, { quantity: newQuantity });
                await createWarehouseHistory({
                    itemId: existingItem.id!,
                    type: 'IN',
                    quantity: quantity,
                    date: new Date(),
                    reason: `Zamówienie: ${order.title} (Projekt: ${order.projectName})`
                });

                // Update local state
                setItems(prev => prev.map(i => i.id === existingItem.id ? { ...i, quantity: newQuantity } : i));
            } else {
                // Create new item
                const newItem = await createWarehouseItem({
                    name: order.title,
                    quantity: quantity,
                    unit: unit,
                    category: 'Zamówienia',
                    location: 'Magazyn',
                    minQuantity: 0,
                    lastUpdated: new Date(),
                    isDeleted: 0
                });

                await createWarehouseHistory({
                    itemId: newItem.id!,
                    type: 'IN',
                    quantity: quantity,
                    date: new Date(),
                    reason: `Zamówienie: ${order.title} (Projekt: ${order.projectName})`
                });

                // Update local state
                setItems(prev => [newItem, ...prev]);
            }

            // Mark order as added to warehouse
            await updateOrder(order.id!, { addedToWarehouse: true });

            // Update local orders state
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, addedToWarehouse: true } : o));

            toast.success(`Dodano do magazynu: ${quantity} ${unit}`);
        } catch (error) {
            console.error("Failed to add to warehouse:", error);
            toast.error("Błąd podczas aktualizacji magazynu");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Magazyn</h2>
                    <p className="text-muted-foreground">Zarządzaj stanami magazynowymi i zamówieniami</p>
                </div>
                <Button onClick={() => { setEditingItem(undefined); setIsAddDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj przedmiot
                </Button>
            </div>

            <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="inventory" className="flex-1 max-w-[200px]">Stan Magazynowy</TabsTrigger>
                    <TabsTrigger value="orders" className="flex-1 max-w-[200px]">Zamówienia</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 my-4">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Szukaj..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                </div>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lista przedmiotów</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nazwa</TableHead>
                                        <TableHead>Kategoria</TableHead>
                                        <TableHead>Lokalizacja</TableHead>
                                        <TableHead>Ilość</TableHead>
                                        <TableHead>Stan</TableHead>
                                        <TableHead className="text-right">Akcje</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div>{item.name}</div>
                                                {item.description && (
                                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.category || "-"}</TableCell>
                                            <TableCell>{item.location || "-"}</TableCell>
                                            <TableCell>
                                                <span className="font-bold text-lg">{item.quantity}</span> <span className="text-muted-foreground text-sm">{item.unit}</span>
                                            </TableCell>
                                            <TableCell>
                                                {item.minQuantity !== undefined && item.quantity <= item.minQuantity ? (
                                                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Niski stan
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                                                        OK
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50" onClick={() => openStockDialog(item, 'IN')}>
                                                                    <ArrowDownCircle className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Przyjęcie (PZ)</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50 mr-2" onClick={() => openStockDialog(item, 'OUT')}>
                                                                    <ArrowUpCircle className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Wydanie (WZ)</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistoryDialog(item)}>
                                                                    <History className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Historia operacji</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id!)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                Brak przedmiotów w magazynie
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Zamówienia w toku</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nazwa</TableHead>
                                        <TableHead>Projekt</TableHead>
                                        <TableHead>Dostawca</TableHead>
                                        <TableHead>Ilość</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Akcje</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                                <div>{order.title}</div>
                                                {order.notes && (
                                                    <div className="text-xs text-muted-foreground">{order.notes}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{order.projectName}</TableCell>
                                            <TableCell>{order.supplierName}</TableCell>
                                            <TableCell>
                                                <span className="font-bold">{order.quantity || 1}</span> {order.unit || 'szt.'}
                                            </TableCell>
                                            <TableCell>{format(new Date(order.date), 'dd.MM.yyyy')}</TableCell>
                                            <TableCell>
                                                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'Ordered' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {order.status === 'Delivered' ? 'Dostarczone' :
                                                        order.status === 'Ordered' ? 'Zamówione' : 'Do zrobienia'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {order.status === 'Delivered' && !order.addedToWarehouse && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50"
                                                                    onClick={() => addToWarehouse(order)}
                                                                >
                                                                    <ArrowDownCircle className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Dodaj do magazynu</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                {order.status === 'Delivered' && order.addedToWarehouse && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="inline-flex h-8 w-8 items-center justify-center">
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Dodano do magazynu</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                Brak zamówień
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AddWarehouseItemDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSubmit={handleAddItem}
                initialData={editingItem}
            />

            <StockOperationDialog
                open={stockDialogOpen}
                onOpenChange={setStockDialogOpen}
                onSubmit={handleStockOperation}
                item={selectedItem}
                type={operationType}
            />

            <WarehouseHistoryDialog
                open={historyDialogOpen}
                onOpenChange={setHistoryDialogOpen}
                item={historyItem}
            />
        </div>
    );
}
