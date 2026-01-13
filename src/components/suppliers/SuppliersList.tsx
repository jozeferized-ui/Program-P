'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EditSupplierDialog } from '@/components/suppliers/EditSupplierDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone, Calendar, Briefcase, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Supplier, Order, Project } from '@/types';

type SortOption = 'name_asc' | 'name_desc' | 'last_order_desc' | 'last_order_asc';

interface ProcessedSupplier extends Supplier {
    lastOrder?: Order;
    lastProject?: Project;
    categoryName?: string;
}

interface SuppliersListProps {
    initialSuppliers: ProcessedSupplier[];
}

export function SuppliersList({ initialSuppliers }: SuppliersListProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('name_asc');

    const filteredAndSortedSuppliers = useMemo(() => {
        const result = initialSuppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return result.sort((a, b) => {
            switch (sortOption) {
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'last_order_desc':
                    // If no order, put at the bottom
                    if (!a.lastOrder && !b.lastOrder) return a.name.localeCompare(b.name);
                    if (!a.lastOrder) return 1;
                    if (!b.lastOrder) return -1;
                    return new Date(b.lastOrder.date).getTime() - new Date(a.lastOrder.date).getTime();
                case 'last_order_asc':
                    // If no order, put at the bottom
                    if (!a.lastOrder && !b.lastOrder) return a.name.localeCompare(b.name);
                    if (!a.lastOrder) return 1;
                    if (!b.lastOrder) return -1;
                    return new Date(a.lastOrder.date).getTime() - new Date(b.lastOrder.date).getTime();
                default:
                    return 0;
            }
        });
    }, [initialSuppliers, searchQuery, sortOption]);

    return (
        <>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Szukaj dostawcy..."
                        className="pl-8 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Sortuj według:</span>
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                        <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name_asc">Nazwa (A-Z)</SelectItem>
                            <SelectItem value="name_desc">Nazwa (Z-A)</SelectItem>
                            <SelectItem value="last_order_desc">Ostatnie zamówienie (Najnowsze)</SelectItem>
                            <SelectItem value="last_order_asc">Ostatnie zamówienie (Najstarsze)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                {filteredAndSortedSuppliers.map((supplier) => (
                    <Card key={supplier.id} className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-blue-500">
                        <CardContent className="p-0">
                            <div
                                className="flex flex-col md:flex-row md:items-center py-2 px-4 gap-2 cursor-pointer"
                                onClick={() => router.push(`/suppliers/${supplier.id}`)}
                            >
                                {/* Left Section: Basic Info */}
                                <div className="flex-[2] min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-base truncate">{supplier.name}</h3>
                                        {supplier.categoryName && (
                                            <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5">
                                                {supplier.categoryName}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        {supplier.contactPerson && (
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {supplier.contactPerson}
                                            </span>
                                        )}
                                        {supplier.phone && (
                                            <span className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                                                <Phone className="h-3 w-3" />
                                                <a href={`tel:${supplier.phone}`} className="hover:underline">
                                                    {supplier.phone}
                                                </a>
                                            </span>
                                        )}
                                        {supplier.email && (
                                            <span className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                                                <Mail className="h-3 w-3" />
                                                <a href={`mailto:${supplier.email}`} className="hover:underline">
                                                    {supplier.email}
                                                </a>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Middle Section: Last Activity - Compact */}
                                <div className="flex-1 md:border-l md:pl-4 md:border-r md:pr-4 min-w-0 flex flex-col justify-center">
                                    {supplier.lastOrder ? (
                                        <div className="text-xs space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-blue-500" />
                                                <span className="text-muted-foreground">Ostatnie:</span>
                                                <span className="font-medium">
                                                    {format(new Date(supplier.lastOrder.date), 'd MMM yyyy', { locale: pl })}
                                                </span>
                                            </div>
                                            {supplier.lastProject && (
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase className="h-3 w-3 text-orange-500" />
                                                    <span className="text-muted-foreground">Projekt:</span>
                                                    <span className="font-medium truncate max-w-[150px]" title={supplier.lastProject.name}>
                                                        {supplier.lastProject.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic opacity-50">
                                            Brak historii
                                        </div>
                                    )}
                                </div>

                                {/* Right Section: Actions */}
                                <div className="flex items-center justify-end gap-2 md:w-auto" onClick={(e) => e.stopPropagation()}>
                                    {supplier.website && (
                                        <a
                                            href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-xs flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            title="Otwórz stronę WWW"
                                        >
                                            WWW
                                        </a>
                                    )}
                                    <EditSupplierDialog supplier={supplier} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredAndSortedSuppliers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                        Nie znaleziono dostawców spełniających kryteria.
                    </div>
                )}
            </div>
        </>
    );
}
