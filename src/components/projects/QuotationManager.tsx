'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { QuotationItem, ExtendedProject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, Download, Edit2, X, Check } from 'lucide-react';
// ExcelJS i pdf są importowane dynamicznie w funkcjach eksportu dla lepszej wydajności
import { QuotationPDF } from './QuotationPDF';
import {
    createQuotationItem,
    updateQuotationItem,
    deleteQuotationItem,
    updateQuotationSection,
    deleteQuotationSection,
    getPriceSuggestions
} from '@/actions/quotations';
import { updateProject } from '@/actions/projects';
import { toast } from 'sonner';

const UNIT_OPTIONS = ['szt.', 'm².', 'mb.', 'kpl.', 'doba', 'rbh'] as const;

interface QuotationManagerProps {
    projectId: number;
    items: QuotationItem[];
    project: ExtendedProject | null;
}

export function QuotationManager({ projectId, items, project }: QuotationManagerProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: '1',
        unit: 'szt.',
        unitPrice: '',
        margin: '0',
        priceWithMargin: '',
        section: ''
    });

    const [editingValues, setEditingValues] = useState({
        description: '',
        quantity: '1',
        unit: 'szt.',
        unitPrice: '',
        margin: '0',
        priceWithMargin: '',
        section: ''
    });

    const [renamingSection, setRenamingSection] = useState<string | null>(null);
    const [newSectionName, setNewSectionName] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [quotationTitle, setQuotationTitle] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);

    useEffect(() => {
        if (project?.quotationTitle) {
            setQuotationTitle(project.quotationTitle);
        }
    }, [project?.quotationTitle]);

    const handleTitleBlur = async () => {
        if (project) {
            try {
                await updateProject(projectId, { quotationTitle });
                toast.success("Tytuł oferty zaktualizowany.");
            } catch (error) {
                toast.error("Błąd aktualizacji tytułu oferty.");
            }
        }
    };

    // Auto-update project totalValue when quotation total changes
    useEffect(() => {
        if (!items || !project) return;

        const quotationTotal = items.reduce((sum, item) => sum + item.total, 0);

        // Only update if the value is different to avoid unnecessary updates
        if (project.totalValue !== quotationTotal) {
            updateProject(projectId, { totalValue: quotationTotal }).catch(console.error);
        }
    }, [items, project, projectId]);

    // Get price suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!newItem.description || newItem.description.length < 3) {
                setSuggestions([]);
                return;
            }
            const results = await getPriceSuggestions(newItem.description);
            setSuggestions(results);
        };
        const debounce = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounce);
    }, [newItem.description]);

    // Helper to calculate price with margin
    const calculatePriceWithMargin = (price: number, margin: number) => {
        return (price * (1 + margin / 100)).toFixed(2);
    };

    // Helper to calculate margin from price with margin
    const calculateMargin = (price: number, priceWithMargin: number) => {
        if (price === 0) return 0;
        return (((priceWithMargin / price) - 1) * 100).toFixed(2);
    };

    const handleNewItemChange = (field: string, value: string) => {
        const updates: any = { [field]: value };

        if (field === 'unitPrice') {
            const price = parseFloat(value) || 0;
            const margin = parseFloat(newItem.margin) || 0;
            updates.priceWithMargin = calculatePriceWithMargin(price, margin);
        } else if (field === 'margin') {
            const margin = parseFloat(value) || 0;
            const price = parseFloat(newItem.unitPrice) || 0;
            updates.priceWithMargin = calculatePriceWithMargin(price, margin);
        } else if (field === 'priceWithMargin') {
            const priceWithMargin = parseFloat(value) || 0;
            const price = parseFloat(newItem.unitPrice) || 0;
            if (price !== 0) {
                updates.margin = calculateMargin(price, priceWithMargin);
            }
        }

        setNewItem(prev => ({ ...prev, ...updates }));
    };

    const handleEditItemChange = (field: string, value: string) => {
        const updates: any = { [field]: value };

        if (field === 'unitPrice') {
            const price = parseFloat(value) || 0;
            const margin = parseFloat(editingValues.margin) || 0;
            updates.priceWithMargin = calculatePriceWithMargin(price, margin);
        } else if (field === 'margin') {
            const margin = parseFloat(value) || 0;
            const price = parseFloat(editingValues.unitPrice) || 0;
            updates.priceWithMargin = calculatePriceWithMargin(price, margin);
        } else if (field === 'priceWithMargin') {
            const priceWithMargin = parseFloat(value) || 0;
            const price = parseFloat(editingValues.unitPrice) || 0;
            if (price !== 0) {
                updates.margin = calculateMargin(price, priceWithMargin);
            }
        }

        setEditingValues(prev => ({ ...prev, ...updates }));
    };

    async function addItem() {
        if (!newItem.description) return;

        const quantity = parseFloat(newItem.quantity) || 0;
        const unitPrice = parseFloat(newItem.unitPrice) || 0;
        const margin = parseFloat(newItem.margin) || 0;
        const priceWithMargin = unitPrice * (1 + margin / 100);
        const total = quantity * priceWithMargin;

        try {
            await createQuotationItem({
                projectId,
                description: newItem.description,
                quantity,
                unit: newItem.unit,
                unitPrice,
                margin,
                priceWithMargin,
                total,
                section: newItem.section
            } as QuotationItem);
            setNewItem({ description: '', quantity: '1', unit: 'szt.', unitPrice: '', margin: '0', priceWithMargin: '', section: newItem.section });
            toast.success("Pozycja dodana.");
        } catch (error) {
            console.error('Failed to add quotation item:', error);
            toast.error("Błąd dodawania pozycji.");
        }
    }

    async function updateItem() {
        if (!editingId || !editingValues.description) return;

        const quantity = parseFloat(editingValues.quantity) || 0;
        const unitPrice = parseFloat(editingValues.unitPrice) || 0;
        const margin = parseFloat(editingValues.margin) || 0;
        const priceWithMargin = unitPrice * (1 + margin / 100);
        const total = quantity * priceWithMargin;

        try {
            await updateQuotationItem(editingId, {
                description: editingValues.description,
                quantity,
                unit: editingValues.unit,
                unitPrice,
                margin,
                priceWithMargin,
                total,
                section: editingValues.section
            });
            setEditingId(null);
            setEditingValues({ description: '', quantity: '1', unit: 'szt.', unitPrice: '', margin: '0', priceWithMargin: '', section: '' });
            toast.success("Pozycja zaktualizowana.");
        } catch (error) {
            console.error('Failed to update quotation item:', error);
            toast.error("Błąd aktualizacji pozycji.");
        }
    }

    function startEditing(item: QuotationItem) {
        setEditingId(item.id!);
        const margin = item.margin || 0;
        setEditingValues({
            description: item.description,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitPrice: item.unitPrice.toString(),
            margin: margin.toString(),
            priceWithMargin: (item.unitPrice * (1 + margin / 100)).toFixed(2),
            section: item.section || ''
        });
    }

    function cancelEditing() {
        setEditingId(null);
        setEditingValues({ description: '', quantity: '1', unit: 'szt.', unitPrice: '', margin: '0', priceWithMargin: '', section: '' });
    }

    async function deleteItem(id: number) {
        try {
            await deleteQuotationItem(id);
            if (editingId === id) {
                cancelEditing();
            }
            toast.success("Pozycja usunięta.");
        } catch (error) {
            console.error('Failed to delete quotation item:', error);
            toast.error("Błąd usuwania pozycji.");
        }
    }

    const totalAmount = items?.reduce((sum, item) => sum + item.total, 0) || 0;

    // Group items by section
    const groupedItems = useMemo(() => items?.reduce((groups, item) => {
        const section = item.section || 'Inne';
        if (!groups[section]) {
            groups[section] = [];
        }
        groups[section].push(item);
        return groups;
    }, {} as Record<string, QuotationItem[]>) || {}, [items]);

    const sections = useMemo(() => Object.keys(groupedItems).sort((a, b) => {
        if (a === 'Inne') return 1;
        if (b === 'Inne') return -1;
        return a.localeCompare(b);
    }), [groupedItems]);

    // Get unique existing sections for suggestions
    const existingSections = useMemo(() => Array.from(new Set(items?.map(i => i.section).filter(Boolean))), [items]);

    const handleRenameSection = async (oldName: string) => {
        if (!newSectionName.trim() || newSectionName === oldName) {
            setRenamingSection(null);
            return;
        }

        try {
            await updateQuotationSection(projectId, oldName, newSectionName);
            setRenamingSection(null);
            setNewSectionName('');
            toast.success("Rozdział zmieniony.");
        } catch (error) {
            console.error('Failed to rename section:', error);
            toast.error("Błąd zmiany nazwy rozdziału.");
        }
    };

    const handleDeleteSection = async (sectionName: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć rozdział "${sectionName}" i wszystkie jego pozycje?`)) return;

        try {
            await deleteQuotationSection(projectId, sectionName);
            toast.success("Rozdział usunięty.");
        } catch (error) {
            console.error('Failed to delete section:', error);
            toast.error("Błąd usuwania rozdziału.");
        }
    };

    const handleExportToExcel = async () => {
        if (!items || items.length === 0) return;

        // Dynamiczny import ExcelJS dla lepszej wydajności
        const ExcelJS = (await import('exceljs')).default;

        // Group items by section
        const groupedItems: Record<string, QuotationItem[]> = {};
        items.forEach(item => {
            const section = item.section || 'Inne';
            if (!groupedItems[section]) {
                groupedItems[section] = [];
            }
            groupedItems[section].push(item);
        });

        const sections = Object.keys(groupedItems).sort((a, b) => {
            if (a === 'Inne') return 1;
            if (b === 'Inne') return -1;
            return a.localeCompare(b);
        });

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Wycena');

        // Page Setup
        worksheet.pageSetup = {
            paperSize: 9, // A4
            orientation: 'portrait',
            margins: {
                left: 0.7, right: 0.7, top: 0.75, bottom: 0.75,
                header: 0.3, footer: 0.3
            }
        };

        // Set Columns
        worksheet.columns = [
            { key: 'description', width: 40 },
            { key: 'quantity', width: 10 },
            { key: 'unit', width: 10 },
            { key: 'unitPrice', width: 15 },
            { key: 'priceWithMargin', width: 15 },
            { key: 'total', width: 15 },
            { key: 'margin', width: 10 }
        ];

        // Row 1: Title
        worksheet.mergeCells('A1:G1');
        const titleRow = worksheet.getRow(1);
        titleRow.getCell(1).value = `WYCENA PROJEKTU: ${quotationTitle || 'Bez tytułu'}`;
        titleRow.getCell(1).font = { name: 'Arial', size: 16, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 30;

        // Row 3: Headers
        const headerRow = worksheet.getRow(3);
        headerRow.values = ['Opis', 'Ilość', 'Jedn.', 'Cena bez marży', 'Cena jedn.', 'Razem', 'Marża %'];
        headerRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' } // Blue
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Freeze top 3 rows
        worksheet.views = [
            { state: 'frozen', ySplit: 3 }
        ];

        let currentRowIndex = 4;

        sections.forEach(section => {
            const sectionItems = groupedItems[section];
            const sectionTotal = sectionItems.reduce((sum, item) => sum + item.total, 0);

            // Section Header
            worksheet.mergeCells(`A${currentRowIndex}:G${currentRowIndex}`);
            const sectionRow = worksheet.getRow(currentRowIndex);
            sectionRow.getCell(1).value = section;
            sectionRow.getCell(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
            sectionRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF70AD47' } // Green
            };
            sectionRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            currentRowIndex++;

            // Items
            sectionItems.forEach((item, index) => {
                const row = worksheet.getRow(currentRowIndex);
                const priceWithMargin = item.unitPrice * (1 + (item.margin || 0) / 100);

                row.values = [
                    item.description,
                    item.quantity,
                    item.unit,
                    item.unitPrice,
                    priceWithMargin,
                    item.total,
                    (item.margin || 0) / 100
                ];

                // Styling
                const isEven = index % 2 === 0;
                const fillColor = isEven ? 'FFE2EFDA' : 'FFFFFFFF'; // Light green or white

                row.eachCell((cell, colNumber) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: fillColor }
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                    };
                    cell.font = { name: 'Arial', size: 10 };

                    if (colNumber === 1) cell.alignment = { horizontal: 'left', wrapText: true };
                    else cell.alignment = { horizontal: 'center' };
                });

                // Number formats
                row.getCell(4).numFmt = '#,##0.00 "zł"';
                row.getCell(5).numFmt = '#,##0.00 "zł"';
                row.getCell(6).numFmt = '#,##0.00 "zł"';
                row.getCell(7).numFmt = '0%';

                currentRowIndex++;
            });

            // Section Subtotal
            const subtotalRow = worksheet.getRow(currentRowIndex);
            subtotalRow.values = ['', '', '', '', 'Suma:', sectionTotal, ''];
            subtotalRow.getCell(5).font = { bold: true };
            subtotalRow.getCell(5).alignment = { horizontal: 'right' };
            subtotalRow.getCell(6).numFmt = '#,##0.00 "zł"';
            subtotalRow.getCell(6).font = { bold: true };
            subtotalRow.getCell(6).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' } // Light blue
            };
            currentRowIndex++;
            currentRowIndex++; // Empty row
        });

        // Grand Total
        const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
        const totalRow = worksheet.getRow(currentRowIndex);
        totalRow.values = ['', '', '', '', 'SUMA CAŁKOWITA:', grandTotal, ''];

        totalRow.getCell(5).font = { bold: true, size: 12 };
        totalRow.getCell(5).alignment = { horizontal: 'right' };

        totalRow.getCell(6).numFmt = '#,##0.00 "zł"';
        totalRow.getCell(6).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        totalRow.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Blue
        };
        totalRow.getCell(6).alignment = { horizontal: 'center' };

        // Generate file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        anchor.href = url;
        anchor.download = `Wycena_Projektu_${projectId}_${date}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportToPDF = async () => {
        if (!items || items.length === 0) return;

        try {
            // Dynamiczny import pdf dla lepszej wydajności
            const { pdf } = await import('@react-pdf/renderer');

            const blob = await pdf(
                <QuotationPDF
                    items={items}
                    projectId={projectId}
                    quotationTitle={quotationTitle}
                />
            ).toBlob();

            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            anchor.href = url;
            anchor.download = `Oferta_Projektu_${projectId}_${date}.pdf`;
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            toast.error('Wystąpił błąd podczas generowania PDF.');
        }
    };

    const handleDeleteQuotation = async () => {
        if (!confirm('Czy na pewno chcesz usunąć całą ofertę? Ta operacja jest nieodwracalna.')) return;

        try {
            // Delete all items for this project
            await Promise.all(items.map(item => deleteQuotationItem(item.id!)));

            // Reset title
            setQuotationTitle('');
            await updateProject(projectId, { quotationTitle: '' });
            toast.success("Oferta usunięta.");
        } catch (error) {
            console.error('Failed to delete quotation:', error);
            toast.error('Wystąpił błąd podczas usuwania oferty.');
        }
    };

    const handleStatusChange = async (value: string) => {
        try {
            const statusToSave = value === 'Brak' ? undefined : value;
            await updateProject(projectId, { quoteStatus: statusToSave as any });
            toast.success("Status oferty zaktualizowany.");
        } catch (error) {
            console.error('Failed to update quote status:', error);
            toast.error("Błąd aktualizacji statusu.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Zaakceptowana':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'W trakcie':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Niezaakceptowana':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'Do zmiany':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return '';
        }
    };

    return (
        <Card>
            <CardHeader className="space-y-4">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Oferta
                        </CardTitle>
                        <Select
                            value={project?.quoteStatus || 'Brak'}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className={`w-[180px] ${getStatusColor(project?.quoteStatus || 'Brak')}`}>
                                <SelectValue placeholder="Status oferty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Brak" className="text-gray-600">Brak</SelectItem>
                                <SelectItem value="W trakcie" className="text-blue-600">W trakcie</SelectItem>
                                <SelectItem value="Zaakceptowana" className="text-green-600">Zaakceptowana</SelectItem>
                                <SelectItem value="Niezaakceptowana" className="text-red-600">Niezaakceptowana</SelectItem>
                                <SelectItem value="Do zmiany" className="text-orange-600">Do zmiany</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportToExcel}
                            className="flex items-center gap-2"
                            disabled={!items || items.length === 0}
                        >
                            <Download className="h-4 w-4" />
                            Eksportuj do Excela
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportToPDF}
                            className="flex items-center gap-2"
                            disabled={!items || items.length === 0}
                        >
                            <FileText className="h-4 w-4" />
                            Eksportuj do PDF
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteQuotation}
                            className="flex items-center gap-2"
                            disabled={!items || items.length === 0}
                        >
                            <Trash2 className="h-4 w-4" />
                            Usuń ofertę
                        </Button>
                        <div className="text-lg font-bold text-green-600">
                            Suma: {totalAmount.toFixed(2)} PLN
                        </div>
                    </div>
                </div>
                {/* Quotation Title */}
                <div className="w-full">
                    <Input
                        placeholder="Tytuł oferty (np. Remont mieszkania - ul. Kwiatowa 15)"
                        value={quotationTitle}
                        onChange={(e) => setQuotationTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className="text-lg font-semibold border-2"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Add New Item Form - Dedicated Card */}
                    <Card className="bg-muted/30 border-2 border-dashed">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Dodaj nową pozycję
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Description & Section - Row 1 */}
                                <div className="md:col-span-8 relative">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Opis pozycji</label>
                                    <Input
                                        placeholder="Wpisz opis..."
                                        value={newItem.description}
                                        onChange={(e) => {
                                            setNewItem({ ...newItem, description: e.target.value });
                                            setShowSuggestions(e.target.value.length >= 3);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') addItem();
                                            if (e.key === 'Escape') setShowSuggestions(false);
                                        }}
                                        onFocus={() => newItem.description.length >= 3 && setShowSuggestions(true)}
                                        className="bg-background"
                                    />
                                    {showSuggestions && suggestions && suggestions.length > 0 && (
                                        <div className="absolute z-50 w-full left-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {suggestions.map((suggestion, index) => (
                                                <div
                                                    key={index}
                                                    className="p-2 hover:bg-muted cursor-pointer border-b last:border-0 text-sm"
                                                    onClick={() => {
                                                        setNewItem({
                                                            ...newItem,
                                                            description: suggestion.description,
                                                            unit: suggestion.unit,
                                                            unitPrice: suggestion.lastPrice.toString(),
                                                            margin: suggestion.lastMargin.toString(),
                                                            priceWithMargin: (suggestion.lastPrice * (1 + suggestion.lastMargin / 100)).toFixed(2)
                                                        });
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <div className="flex justify-between">
                                                        <span>{suggestion.description}</span>
                                                        <span className="font-mono">{suggestion.lastPrice.toFixed(2)} zł</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-4">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Rozdział</label>
                                    <Input
                                        list="sections-list"
                                        placeholder="Np. Prace zewnętrzne"
                                        value={newItem.section}
                                        onChange={(e) => setNewItem({ ...newItem, section: e.target.value })}
                                        className="bg-background"
                                    />
                                    <datalist id="sections-list">
                                        {existingSections.map(section => (
                                            <option key={section} value={section} />
                                        ))}
                                    </datalist>
                                </div>

                                {/* Values - Row 2 */}
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Ilość</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                                        className="text-right bg-background"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Jednostka</label>
                                    <Select
                                        value={newItem.unit}
                                        onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                                    >
                                        <SelectTrigger className="bg-background">
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
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Cena netto</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newItem.unitPrice}
                                        onChange={(e) => handleNewItemChange('unitPrice', e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                                        className="text-right bg-background"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Marża (%)</label>
                                    <Input
                                        type="number"
                                        value={newItem.margin}
                                        onChange={(e) => handleNewItemChange('margin', e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                                        className="text-right bg-background"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Cena z marżą</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newItem.priceWithMargin}
                                        onChange={(e) => handleNewItemChange('priceWithMargin', e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                                        className="text-right font-medium bg-background"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-end">
                                    <Button onClick={addItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Dodaj
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="rounded-md border overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-800">
                                <TableRow className="hover:bg-slate-800 border-b-0">
                                    <TableHead className="w-[40%] text-white font-bold h-12">Opis</TableHead>
                                    <TableHead className="text-right w-[8%] text-white font-bold h-12">Ilość</TableHead>
                                    <TableHead className="text-center w-[8%] text-white font-bold h-12">Jedn.</TableHead>
                                    <TableHead className="text-right w-[12%] text-white font-bold h-12">Cena bez marży</TableHead>
                                    <TableHead className="text-right w-[12%] text-white font-bold h-12">Cena jedn.</TableHead>
                                    <TableHead className="text-right w-[10%] text-white font-bold h-12">Razem</TableHead>
                                    <TableHead className="text-right w-[8%] text-white font-bold h-12">Marża</TableHead>
                                    <TableHead className="w-[10%] text-center text-white font-bold h-12">Akcje</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sections.map((section, index) => {
                                    const sectionItems = groupedItems[section];
                                    const sectionTotal = sectionItems.reduce((sum, item) => sum + (item.quantity * (item.priceWithMargin || 0)), 0);

                                    // Generate a consistent color for the section based on index
                                    const colors = [
                                        'bg-blue-50 border-blue-100 text-blue-900',
                                        'bg-green-50 border-green-100 text-green-900',
                                        'bg-purple-50 border-purple-100 text-purple-900',
                                        'bg-amber-50 border-amber-100 text-amber-900',
                                        'bg-rose-50 border-rose-100 text-rose-900',
                                        'bg-cyan-50 border-cyan-100 text-cyan-900',
                                        'bg-indigo-50 border-indigo-100 text-indigo-900',
                                        'bg-teal-50 border-teal-100 text-teal-900'
                                    ];
                                    const sectionColor = colors[index % colors.length];

                                    return (
                                        <React.Fragment key={section}>
                                            {/* Section Header - Colored */}
                                            <TableRow className={`${sectionColor} border-b hover:opacity-90 transition-colors`}>
                                                <TableCell className="font-bold text-left py-2 pl-4 border-r relative group text-base" colSpan={8}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{section}</span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 hover:bg-white/50"
                                                                onClick={() => {
                                                                    setRenamingSection(section);
                                                                    setNewSectionName(section);
                                                                }}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-white/50"
                                                                onClick={() => handleDeleteSection(section)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {sectionItems.map((item) => (
                                                <TableRow key={item.id} className="bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                                    {editingId === item.id ? (
                                                        <TableCell colSpan={8} className="p-0">
                                                            <div className="flex w-full bg-blue-50/30">
                                                                <div className="w-[40%] p-2 border-r">
                                                                    <Input
                                                                        value={editingValues.description}
                                                                        onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                                                                        className="h-8"
                                                                    />
                                                                </div>
                                                                <div className="w-[8%] p-2 border-r">
                                                                    <Input
                                                                        type="number"
                                                                        value={editingValues.quantity}
                                                                        onChange={(e) => setEditingValues({ ...editingValues, quantity: e.target.value })}
                                                                        className="h-8 text-right px-1"
                                                                    />
                                                                </div>
                                                                <div className="w-[8%] p-2 border-r">
                                                                    <Select
                                                                        value={editingValues.unit}
                                                                        onValueChange={(value) => setEditingValues({ ...editingValues, unit: value })}
                                                                    >
                                                                        <SelectTrigger className="h-8 px-1">
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
                                                                <div className="w-[12%] p-2 border-r">
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editingValues.unitPrice}
                                                                        onChange={(e) => handleEditItemChange('unitPrice', e.target.value)}
                                                                        className="h-8 text-right px-1"
                                                                    />
                                                                </div>
                                                                <div className="w-[12%] p-2 border-r">
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={editingValues.priceWithMargin}
                                                                        onChange={(e) => handleEditItemChange('priceWithMargin', e.target.value)}
                                                                        className="h-8 text-right font-bold px-1"
                                                                    />
                                                                </div>
                                                                <div className="w-[10%] p-2 border-r text-right align-middle text-sm font-medium pt-3">
                                                                    {((parseFloat(editingValues.quantity) || 0) * (parseFloat(editingValues.priceWithMargin) || 0)).toFixed(2)}
                                                                </div>
                                                                <div className="w-[8%] p-2 border-r">
                                                                    <Input
                                                                        type="number"
                                                                        value={editingValues.margin}
                                                                        onChange={(e) => handleEditItemChange('margin', e.target.value)}
                                                                        className="h-8 text-right px-1"
                                                                    />
                                                                </div>
                                                                <div className="w-[10%] p-2 flex items-center justify-center gap-1">
                                                                    <Button onClick={updateItem} size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600">
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button onClick={() => setEditingId(null)} size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    ) : (
                                                        <>
                                                            <TableCell className="border-r border-slate-100 py-3 pl-4">{item.description}</TableCell>
                                                            <TableCell className="text-right border-r border-slate-100 py-3">{item.quantity}</TableCell>
                                                            <TableCell className="text-center border-r border-slate-100 py-3">{item.unit}</TableCell>
                                                            <TableCell className="text-right border-r border-slate-100 py-3 text-muted-foreground">{item.unitPrice.toFixed(2)} <span className="text-[10px]">netto</span></TableCell>
                                                            <TableCell className="text-right border-r border-slate-100 py-3 font-medium">{(item.priceWithMargin || 0).toFixed(2)} <span className="text-[10px] text-muted-foreground">netto</span></TableCell>
                                                            <TableCell className="text-right border-r border-slate-100 py-3 font-semibold">{item.total.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">netto</span></TableCell>
                                                            <TableCell className="text-right border-r border-slate-100 py-3 text-xs text-muted-foreground">{item.margin}%</TableCell>
                                                            <TableCell className="text-center py-3">
                                                                <div className="flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEditing(item)}>
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteItem(item.id!)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            ))}

                                            {/* Section Subtotal */}
                                            <TableRow className="bg-slate-50 font-medium border-b border-slate-200">
                                                <TableCell className="border-r border-slate-200" colSpan={4}></TableCell>
                                                <TableCell className="text-right border-r border-slate-200 px-2 py-2 text-sm">Suma {section}:</TableCell>
                                                <TableCell className="text-right border-r border-slate-200 px-2 py-2 font-bold text-slate-700">{sectionTotal.toFixed(2)} PLN</TableCell>
                                                <TableCell className="border-r border-slate-200" colSpan={2}></TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                                {items?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                                            Brak pozycji w wycenie. Dodaj pierwszą pozycję powyżej.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <TableFooter className="bg-slate-100 border-t-2 border-slate-200">
                                <TableRow>
                                    <TableCell className="border-r border-slate-200" colSpan={4}></TableCell>
                                    <TableCell className="text-right font-bold border-r border-slate-200 text-lg py-4">RAZEM:</TableCell>
                                    <TableCell className="text-right font-bold text-xl border-r border-slate-200 py-4 text-slate-900">{totalAmount.toFixed(2)} PLN <span className="text-sm font-normal text-muted-foreground">netto</span></TableCell>
                                    <TableCell className="border-r border-slate-200" colSpan={2}></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            </CardContent >
        </Card >
    );
}
