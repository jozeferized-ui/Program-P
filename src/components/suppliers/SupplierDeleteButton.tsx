'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteSupplier } from '@/actions/suppliers';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SupplierDeleteButtonProps {
    supplierId: number;
}

export function SupplierDeleteButton({ supplierId }: SupplierDeleteButtonProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteSupplier(supplierId);
            router.push('/suppliers');
        } catch (error) {
            console.error("Failed to delete supplier:", error);
        }
    };

    return (
        <>
            <Button
                variant="destructive"
                size="icon"
                onClick={() => setIsDeleteOpen(true)}
                title="Usuń dostawcę"
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Czy na pewno chcesz usunąć tego dostawcę?</DialogTitle>
                        <DialogDescription>
                            Ta operacja jest nieodwracalna.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Anuluj</Button>
                        <Button variant="destructive" onClick={handleDelete}>Usuń</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
