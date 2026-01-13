'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getPriceHistory } from '@/actions/trash';

interface HistoryItem {
    id: number;
    projectId: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    margin: number;
    projectName: string;
    clientName: string;
    acceptedDate: Date | null;
}

export function PriceHistory() {
    const [searchTerm, setSearchTerm] = useState('');
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            const items = await getPriceHistory();
            setHistoryItems(items as HistoryItem[]);
        };
        fetchHistory();
    }, []);

    // Filter items based on search
    const filteredItems = historyItems.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by description for statistics
    const groupedByDescription: Record<string, HistoryItem[]> = {};
    filteredItems.forEach(item => {
        if (!groupedByDescription[item.description]) {
            groupedByDescription[item.description] = [];
        }
        groupedByDescription[item.description].push(item);
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Pozycje z zaakceptowanych ofert</CardTitle>
                    <div className="flex items-center gap-2 mt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Szukaj po opisie, projekcie lub kliencie..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Opis</TableHead>
                                <TableHead>Projekt</TableHead>
                                <TableHead>Klient</TableHead>
                                <TableHead className="text-right">Ilość</TableHead>
                                <TableHead className="text-center">Jedn.</TableHead>
                                <TableHead className="text-right">Cena bez marży</TableHead>
                                <TableHead className="text-right">Cena jedn.</TableHead>
                                <TableHead className="text-right">Marża %</TableHead>
                                <TableHead className="text-center">Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        {searchTerm ? 'Nie znaleziono pasujących pozycji' : 'Brak zaakceptowanych ofert'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => {
                                    const priceWithMargin = item.unitPrice * (1 + (item.margin || 0) / 100);
                                    return (
                                        <TableRow key={`${item.id}-${item.projectId}`}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{item.projectName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{item.clientName}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-center">{item.unit}</TableCell>
                                            <TableCell className="text-right">
                                                {item.unitPrice.toFixed(2)} zł
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {priceWithMargin.toFixed(2)} zł
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.margin || 0}%
                                            </TableCell>
                                            <TableCell className="text-center text-sm">
                                                {item.acceptedDate ? format(new Date(item.acceptedDate), 'dd.MM.yyyy', { locale: pl }) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {Object.keys(groupedByDescription).length > 0 && searchTerm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Statystyki dla wyszukiwanych pozycji</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(groupedByDescription).map(([description, items]) => {
                                const avgPrice = items.reduce((sum, item) => sum + item.unitPrice, 0) / items.length;
                                const minPrice = Math.min(...items.map(item => item.unitPrice));
                                const maxPrice = Math.max(...items.map(item => item.unitPrice));
                                const lastUsed = items[0]; // Already sorted by date

                                return (
                                    <div key={description} className="p-4 border rounded-lg">
                                        <h3 className="font-semibold mb-2">{description}</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Użyto</p>
                                                <p className="font-medium">{items.length}x</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Średnia cena</p>
                                                <p className="font-medium">{avgPrice.toFixed(2)} zł</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Min - Max</p>
                                                <p className="font-medium">{minPrice.toFixed(2)} - {maxPrice.toFixed(2)} zł</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Ostatnio</p>
                                                <p className="font-medium">
                                                    {lastUsed.acceptedDate ? format(new Date(lastUsed.acceptedDate), 'dd.MM.yyyy', { locale: pl }) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
