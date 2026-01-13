'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createSupplier, getSupplierCategories, createSupplierCategory } from '@/actions/suppliers';
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
import { Plus, Check, X } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';

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

export function AddSupplierDialog() {
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            website: '',
            notes: '',
            categoryId: '',
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

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await createSupplier({
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
            form.reset();
        } catch (error) {
            console.error('Failed to add supplier:', error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj Dostawcę
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Dodaj Nowego Dostawcę</DialogTitle>
                    <DialogDescription>
                        Wprowadź dane nowego dostawcy. Kliknij zapisz, aby dodać go do bazy.
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
                                                    autoFocus
                                                />
                                                <Button type="button" size="icon" onClick={handleCreateCategory} className="shrink-0">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button type="button" size="icon" variant="ghost" onClick={() => setIsCreatingCategory(false)} className="shrink-0">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex gap-2">
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Wybierz kategorię" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">Brak</SelectItem>
                                                        {categories?.map((category) => (
                                                            <SelectItem key={category.id} value={category.id!.toString()}>
                                                                {category.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="outline" onClick={() => setIsCreatingCategory(true)}>
                                                    Nowa
                                                </Button>
                                            </div>
                                        )}
                                    </div>
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
                                            <Input
                                                placeholder="+48 123 456 789"
                                                {...field}
                                                onChange={(e) => {
                                                    const formatted = formatPhoneNumber(e.target.value);
                                                    field.onChange(formatted);
                                                }}
                                            />
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
                        <Button type="submit" className="w-full">Zapisz</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
