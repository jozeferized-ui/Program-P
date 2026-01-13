'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateSupplier, deleteSupplier, getSupplierCategories, createSupplierCategory } from '@/actions/suppliers';
import { Supplier } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X } from 'lucide-react';

const formSchema = z.object({
    name: z.string().min(2, {
        message: 'Nazwa dostawcy musi mieć co najmniej 2 znaki.',
    }),
    contactPerson: z.string().optional(),
    email: z.string().email({
        message: 'Nieprawidłowy adres email.',
    }).optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
    notes: z.string().optional(),
    categoryId: z.string().optional(),
});

interface EditSupplierDialogProps {
    supplier: Supplier;
}

export function EditSupplierDialog({ supplier }: EditSupplierDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: supplier.name,
            contactPerson: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            website: supplier.website || '',
            notes: supplier.notes || '',
            categoryId: supplier.categoryId?.toString() || 'none',
        },
    });

    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    // Load categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            const cats = await getSupplierCategories();
            setCategories(cats);
        };
        loadCategories();
    }, []);

    async function handleCreateCategory() {
        if (!newCategoryName.trim()) return;
        try {
            const newCategory = await createSupplierCategory(newCategoryName);
            setCategories(prev => [...prev, newCategory]);
            setNewCategoryName("");
            setIsCreatingCategory(false);
            form.setValue("categoryId", newCategory.id.toString());
        } catch (error) {
            console.error("Failed to create category:", error);
        }
    }

    // Reset form when supplier prop changes or dialog opens
    useEffect(() => {
        if (open) {
            form.reset({
                name: supplier.name,
                contactPerson: supplier.contactPerson || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                website: supplier.website || '',
                notes: supplier.notes || '',
                categoryId: supplier.categoryId?.toString() || 'none',
            });
        }
    }, [open, supplier, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await updateSupplier(supplier.id!, {
                name: values.name,
                contactPerson: values.contactPerson,
                email: values.email || undefined,
                phone: values.phone || undefined,
                address: values.address || undefined,
                website: values.website || undefined,
                notes: values.notes || undefined,
                categoryId: values.categoryId && values.categoryId !== 'none' ? parseInt(values.categoryId) : undefined,
            });
            setOpen(false);
        } catch (error) {
            console.error('Failed to update supplier:', error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edytuj</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edytuj Dostawcę</DialogTitle>
                    <DialogDescription>
                        Zmień dane dostawcy i kliknij zapisz.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nazwa Firmy</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nazwa dostawcy" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactPerson"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Osoba Kontaktowa</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Imię i nazwisko" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@firma.pl" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefon</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+48 123 456 789" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adres</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ul. Przykładowa 1, 00-000 Warszawa" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Strona WWW</FormLabel>
                                    <FormControl>
                                        <Input placeholder="www.firma.pl" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategoria</FormLabel>
                                    <div className="flex gap-2">
                                        {isCreatingCategory ? (
                                            <div className="flex-1 flex gap-2">
                                                <Input
                                                    placeholder="Nowa kategoria..."
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                />
                                                <Button type="button" size="icon" onClick={handleCreateCategory}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => setIsCreatingCategory(false)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Wybierz kategorię" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">Brak</SelectItem>
                                                    {categories?.map((category) => (
                                                        <SelectItem key={category.id} value={category.id?.toString() || ""}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {!isCreatingCategory && (
                                            <Button type="button" variant="outline" size="icon" onClick={() => setIsCreatingCategory(true)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notatki</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Dodatkowe informacje..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-between pt-4">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={async () => {
                                    if (confirm("Czy na pewno chcesz usunąć tego dostawcę?")) {
                                        try {
                                            await deleteSupplier(supplier.id!);
                                            setOpen(false);
                                        } catch (error) {
                                            console.error("Failed to delete supplier:", error);
                                        }
                                    }
                                }}
                            >
                                Usuń
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Anuluj
                                </Button>
                                <Button type="submit">
                                    Zapisz Zmiany
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
