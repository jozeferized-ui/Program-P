'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { restoreItem, permanentlyDeleteItem } from '@/actions/trash';

interface TrashItemCardProps {
    item: {
        id: number;
        name?: string;
        title?: string;
        deletedAt?: Date | null;
    };
    table: 'project' | 'client' | 'supplier' | 'order';
}

export function TrashItemCard({ item, table }: TrashItemCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRestore = async () => {
        setIsLoading(true);
        try {
            await restoreItem(table, item.id);
            toast.success('Przywrócono element');
        } catch (error) {
            console.error('Failed to restore:', error);
            toast.error('Błąd podczas przywracania');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePermanentDelete = async () => {
        if (confirm('Czy na pewno chcesz trwale usunąć ten element? Tej operacji nie można cofnąć.')) {
            setIsLoading(true);
            try {
                await permanentlyDeleteItem(table, item.id);
                toast.success('Element usunięty trwale');
            } catch (error) {
                console.error('Failed to delete:', error);
                toast.error('Błąd podczas usuwania');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Card className="mb-4">
            <CardContent className="flex items-center justify-between p-4">
                <div>
                    <h3 className="font-semibold">{item.name || item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                        Usunięto: {item.deletedAt ? format(new Date(item.deletedAt), 'd MMM yyyy HH:mm', { locale: pl }) : 'Nieznana data'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRestore} disabled={isLoading}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Przywróć
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handlePermanentDelete} disabled={isLoading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Usuń trwale
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
