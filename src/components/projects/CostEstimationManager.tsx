'use client';

import { useState, useEffect } from 'react';
import { CostEstimateItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, Edit2, Check, X } from 'lucide-react';
import { createCostEstimate, updateCostEstimate, deleteCostEstimate } from '@/actions/costEstimates';
import { createOrder } from '@/actions/orders';
import { createExpense } from '@/actions/expenses';
import { toast } from 'sonner';

const UNIT_OPTIONS = ['szt.', 'm².', 'mb.', 'kpl.', 'doba', 'rbh'] as const;

interface CostEstimationManagerProps {
    projectId: number;
    initialItems?: CostEstimateItem[];
}

export function CostEstimationManager({ projectId, initialItems = [] }: CostEstimationManagerProps) {
    const [items, setItems] = useState<CostEstimateItem[]>(initialItems);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: '1',
        unit: 'szt.',
        unitNetPrice: '',
        taxRate: '23',
        section: ''
    });
    const [addToOrders, setAddToOrders] = useState(false);

    const [editingValues, setEditingValues] = useState({
        description: '',
        quantity: '1',
        unit: 'szt.',
        unitNetPrice: '',
        taxRate: '23',
        section: ''
    });

    const [renamingSection, setRenamingSection] = useState<string | null>(null);
    const [newSectionName, setNewSectionName] = useState('');

    // Helpers
    const calculateGross = (net: number, tax: number) => net * (1 + tax / 100);

    const handleNewItemChange = (field: string, value: string) => {
        setNewItem(prev => ({ ...prev, [field]: value }));
    };

    const handleEditItemChange = (field: string, value: string) => {
        setEditingValues(prev => ({ ...prev, [field]: value }));
    };

    async function addItem() {
        if (!newItem.description) return;

        const quantity = parseFloat(newItem.quantity) || 0;
        const unitNetPrice = parseFloat(newItem.unitNetPrice) || 0;
        const taxRate = parseFloat(newItem.taxRate) || 0;
        const totalNet = quantity * unitNetPrice;
        const totalGross = quantity * calculateGross(unitNetPrice, taxRate);

        try {
            const createdItem = await createCostEstimate({
                projectId,
                description: newItem.description,
                quantity,
                unit: newItem.unit,
                unitNetPrice,
                taxRate,
                section: newItem.section
            });

            // Optimistic update (or wait for revalidation via props)
            // We'll update local state for immediate feedback
            setItems(prev => [...prev, createdItem]);

            // If "Add to Orders" is checked, create an order
            if (addToOrders) {
                const order = await createOrder({
                    projectId,
                    title: newItem.description,
                    amount: totalGross,
                    status: 'Pending',
                    date: new Date(),
                    notes: `Utworzone z wyceny kosztów`
                });

                // Also create expense for the order
                await createExpense({
                    projectId,
                    title: `Zamówienie: ${newItem.description}`,
                    amount: totalGross,
                    netAmount: totalNet,
                    taxRate,
                    type: 'Purchase',
                    date: new Date(),
                    orderId: order.id
                });

                toast.success("Dodano pozycję oraz zamówienie");
            } else {
                toast.success("Dodano pozycję do wyceny");
            }

            setNewItem({ description: '', quantity: '1', unit: 'szt.', unitNetPrice: '', taxRate: '23', section: newItem.section });
            setAddToOrders(false);
        } catch (error) {
            console.error('Failed to add cost estimate item:', error);
            toast.error("Błąd dodawania pozycji");
        }
    }

    async function updateItem() {
        if (!editingId || !editingValues.description) return;

        const quantity = parseFloat(editingValues.quantity) || 0;
        const unitNetPrice = parseFloat(editingValues.unitNetPrice) || 0;
        const taxRate = parseFloat(editingValues.taxRate) || 0;

        try {
            const updatedItem = await updateCostEstimate(editingId, {
                description: editingValues.description,
                quantity,
                unit: editingValues.unit,
                unitNetPrice,
                taxRate,
                section: editingValues.section
            });

            setItems(prev => prev.map(item => item.id === editingId ? updatedItem : item));

            setEditingId(null);
            setEditingValues({ description: '', quantity: '1', unit: 'szt.', unitNetPrice: '', taxRate: '23', section: '' });
            toast.success("Zaktualizowano pozycję");
        } catch (error) {
            console.error('Failed to update cost estimate item:', error);
            toast.error("Błąd aktualizacji pozycji");
        }
    }

    function startEditing(item: CostEstimateItem) {
        setEditingId(item.id!);
        setEditingValues({
            description: item.description,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitNetPrice: item.unitNetPrice.toString(),
            taxRate: item.taxRate.toString(),
            section: item.section || ''
        });
    }

    function cancelEditing() {
        setEditingId(null);
        setEditingValues({ description: '', quantity: '1', unit: 'szt.', unitNetPrice: '', taxRate: '23', section: '' });
    }

    async function deleteItem(id: number) {
        try {
            await deleteCostEstimate(id);
            setItems(prev => prev.filter(item => item.id !== id));

            if (editingId === id) {
                cancelEditing();
            }
            toast.success("Usunięto pozycję");
        } catch (error) {
            console.error('Failed to delete cost estimate item:', error);
            toast.error("Błąd usuwania pozycji");
        }
    }

    // Calculations
    const totalNet = items?.reduce((sum, item) => sum + (item.quantity * item.unitNetPrice), 0) || 0;
    const totalGross = items?.reduce((sum, item) => sum + (item.quantity * calculateGross(item.unitNetPrice, item.taxRate)), 0) || 0;

    // Group items by section
    const groupedItems = items?.reduce((groups, item) => {
        const section = item.section || 'Inne';
        if (!groups[section]) {
            groups[section] = [];
        }
        groups[section].push(item);
        return groups;
    }, {} as Record<string, CostEstimateItem[]>) || {};

    const sections = Object.keys(groupedItems).sort((a, b) => {
        if (a === 'Inne') return 1;
        if (b === 'Inne') return -1;
        return a.localeCompare(b);
    });

    const existingSections = Array.from(new Set(items?.map(i => i.section).filter(Boolean)));

    const handleRenameSection = async (oldName: string) => {
        if (!newSectionName.trim() || newSectionName === oldName) {
            setRenamingSection(null);
            return;
        }

        try {
            const itemsToUpdate = items?.filter(item => (item.section || 'Inne') === oldName) || [];

            // Optimistic update
            setItems(prev => prev.map(item => {
                if ((item.section || 'Inne') === oldName) {
                    return { ...item, section: newSectionName };
                }
                return item;
            }));

            await Promise.all(itemsToUpdate.map(item =>
                updateCostEstimate(item.id!, { section: newSectionName })
            ));

            setRenamingSection(null);
            setNewSectionName('');
            toast.success("Zmieniono nazwę rozdziału");
        } catch (error) {
            console.error('Failed to rename section:', error);
            toast.error("Błąd zmiany nazwy rozdziału");
            // Revert optimistic update if needed (omitted for brevity)
        }
    };

    const handleDeleteSection = async (sectionName: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć rozdział "${sectionName}" i wszystkie jego pozycje?`)) return;

        try {
            const itemsToDelete = items?.filter(item => (item.section || 'Inne') === sectionName) || [];

            // Optimistic update
            setItems(prev => prev.filter(item => (item.section || 'Inne') !== sectionName));

            await Promise.all(itemsToDelete.map(item =>
                deleteCostEstimate(item.id!)
            ));
            toast.success("Usunięto rozdział");
        } catch (error) {
            console.error('Failed to delete section:', error);
            toast.error("Błąd usuwania rozdziału");
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Wycena Kosztów
                </CardTitle>
                <div className="flex flex-col items-end">
                    <div className="text-sm text-muted-foreground">
                        Netto: {totalNet.toFixed(2)} PLN
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                        Brutto: {totalGross.toFixed(2)} PLN
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Add New Item Form */}
                    <div className="flex gap-2 items-end border-b pb-4 flex-wrap">
                        <div className="w-full md:w-1/4">
                            <label className="text-sm font-medium mb-1 block">Rozdział</label>
                            <Input
                                list="sections-list-cost"
                                placeholder="Np. Materiały"
                                value={newItem.section}
                                onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
                            />
                            <datalist id="sections-list-cost">
                                {existingSections.map(section => (
                                    <option key={section} value={section} />
                                ))}
                            </datalist>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium mb-1 block">Opis pozycji</label>
                            <Input
                                placeholder="Np. Cement"
                                value={newItem.description}
                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addItem();
                                }}
                            />
                        </div>
                        <div className="w-20">
                            <label className="text-sm font-medium mb-1 block">Ilość</label>
                            <Input
                                type="number"
                                min="1"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addItem();
                                }}
                            />
                        </div>
                        <div className="w-20">
                            <label className="text-sm font-medium mb-1 block">Jedn.</label>
                            <Select
                                value={newItem.unit}
                                onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="szt." />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIT_OPTIONS.map((unit) => (
                                        <SelectItem key={unit} value={unit}>
                                            {unit}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-28">
                            <label className="text-sm font-medium mb-1 block">Cena Netto</label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={newItem.unitNetPrice}
                                onChange={(e) => handleNewItemChange('unitNetPrice', e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addItem();
                                }}
                            />
                        </div>
                        <div className="w-20">
                            <label className="text-sm font-medium mb-1 block">VAT %</label>
                            <Input
                                type="number"
                                min="0"
                                value={newItem.taxRate}
                                onChange={(e) => handleNewItemChange('taxRate', e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addItem();
                                }}
                            />
                        </div>
                        <div className="w-32 flex flex-col justify-end pb-2">
                            <span className="text-xs text-muted-foreground block mb-1">Brutto (Suma):</span>
                            <span className="font-bold text-lg">
                                {((parseFloat(newItem.quantity) || 0) * calculateGross(parseFloat(newItem.unitNetPrice) || 0, parseFloat(newItem.taxRate) || 0)).toFixed(2)} PLN
                            </span>
                        </div>
                        <div className="flex flex-col justify-end gap-2">
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={addToOrders}
                                    onChange={(e) => setAddToOrders(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <span>Dodaj do zamówień</span>
                            </label>
                            <Button onClick={addItem} className="mb-0.5">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-800">
                                <TableRow className="hover:bg-slate-800 border-b-0">
                                    <TableHead className="text-white font-bold h-12">Opis</TableHead>
                                    <TableHead className="text-right text-white font-bold h-12">Ilość</TableHead>
                                    <TableHead className="text-center w-[80px] text-white font-bold h-12">Jedn.</TableHead>
                                    <TableHead className="text-right text-white font-bold h-12">Cena Netto</TableHead>
                                    <TableHead className="text-right text-white font-bold h-12">VAT</TableHead>
                                    <TableHead className="text-right text-white font-bold h-12">Cena Brutto</TableHead>
                                    <TableHead className="text-right text-white font-bold h-12">Wartość Brutto</TableHead>
                                    <TableHead className="w-[100px] text-center text-white font-bold h-12">Akcje</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sections.map(section => {
                                    const sectionItems = groupedItems[section];
                                    const sectionTotalNet = sectionItems.reduce((sum, item) => sum + (item.quantity * item.unitNetPrice), 0);
                                    const sectionTotalGross = sectionItems.reduce((sum, item) => sum + (item.quantity * calculateGross(item.unitNetPrice, item.taxRate)), 0);

                                    return (
                                        <>
                                            <TableRow key={`section-${section}`} className="bg-muted/50 border-t-2 border-muted">
                                                <TableCell colSpan={8} className="py-2">
                                                    <div className="flex items-center justify-between group">
                                                        {renamingSection === section ? (
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={newSectionName}
                                                                    onChange={(e) => setNewSectionName(e.target.value)}
                                                                    className="h-8 w-64"
                                                                    autoFocus
                                                                />
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleRenameSection(section)}>
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setRenamingSection(null)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 font-bold">
                                                                {section}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                                        onClick={() => {
                                                                            setRenamingSection(section);
                                                                            setNewSectionName(section);
                                                                        }}
                                                                    >
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                                        onClick={() => handleDeleteSection(section)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {sectionItems.map((item) => (
                                                editingId === item.id ? (
                                                    <TableRow key={item.id} className="bg-muted/50">
                                                        <TableCell colSpan={8} className="p-0">
                                                            <div className="p-4 bg-muted/50 space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    <div className="lg:col-span-2">
                                                                        <label className="text-xs font-medium mb-1 block">Opis</label>
                                                                        <Input
                                                                            value={editingValues.description}
                                                                            onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium mb-1 block">Rozdział</label>
                                                                        <Input
                                                                            list="sections-list-edit-cost"
                                                                            value={editingValues.section}
                                                                            onChange={(e) => setEditingValues({ ...editingValues, section: e.target.value })}
                                                                            placeholder="Rozdział"
                                                                        />
                                                                        <datalist id="sections-list-edit-cost">
                                                                            {existingSections.map(s => (
                                                                                <option key={s} value={s} />
                                                                            ))}
                                                                        </datalist>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <label className="text-xs font-medium mb-1 block">Ilość</label>
                                                                            <Input
                                                                                type="number"
                                                                                value={editingValues.quantity}
                                                                                onChange={(e) => setEditingValues({ ...editingValues, quantity: e.target.value })}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-medium mb-1 block">Jedn.</label>
                                                                            <Select
                                                                                value={editingValues.unit}
                                                                                onValueChange={(value) => setEditingValues({ ...editingValues, unit: value })}
                                                                            >
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {UNIT_OPTIONS.map((unit) => (
                                                                                        <SelectItem key={unit} value={unit}>
                                                                                            {unit}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium mb-1 block">Cena Netto</label>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={editingValues.unitNetPrice}
                                                                            onChange={(e) => handleEditItemChange('unitNetPrice', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium mb-1 block">VAT %</label>
                                                                        <Input
                                                                            type="number"
                                                                            value={editingValues.taxRate}
                                                                            onChange={(e) => handleEditItemChange('taxRate', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col justify-end">
                                                                        <span className="text-xs text-muted-foreground block mb-1">Razem Brutto:</span>
                                                                        <span className="font-bold">
                                                                            {((parseFloat(editingValues.quantity) || 0) * calculateGross(parseFloat(editingValues.unitNetPrice) || 0, parseFloat(editingValues.taxRate) || 0)).toFixed(2)} PLN
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={cancelEditing}
                                                                    >
                                                                        Anuluj
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={updateItem}
                                                                    >
                                                                        Zapisz
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.description}</TableCell>
                                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                                        <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                                                        <TableCell className="text-right">{item.unitNetPrice.toFixed(2)} PLN</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{item.taxRate}%</TableCell>
                                                        <TableCell className="text-right">{calculateGross(item.unitNetPrice, item.taxRate).toFixed(2)} PLN</TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {(item.quantity * calculateGross(item.unitNetPrice, item.taxRate)).toFixed(2)} PLN
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:text-blue-600"
                                                                    onClick={() => startEditing(item)}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => deleteItem(item.id!)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            ))}
                                            <TableRow className="bg-muted/10 font-medium">
                                                <TableCell colSpan={5} className="text-right">Suma {section}:</TableCell>
                                                <TableCell className="text-right text-sm text-muted-foreground">Netto: {sectionTotalNet.toFixed(2)} PLN</TableCell>
                                                <TableCell className="text-right">{sectionTotalGross.toFixed(2)} PLN</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </>
                                    );
                                })}
                                {items?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            Brak kosztów. Dodaj pierwszą pozycję powyżej.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={5} className="text-right font-bold">Razem:</TableCell>
                                    <TableCell className="text-right font-medium text-muted-foreground">Netto: {totalNet.toFixed(2)} PLN</TableCell>
                                    <TableCell className="text-right font-bold text-lg">Brutto: {totalGross.toFixed(2)} PLN</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
