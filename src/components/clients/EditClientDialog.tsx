'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { updateClient, createClientCategory } from '@/actions/clients';
import { Client, ClientCategory } from '@/types';

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Nazwa klienta musi mieć co najmniej 2 znaki.",
    }),
    email: z.string().email({
        message: "Nieprawidłowy adres email.",
    }).optional().or(z.literal('')),
    phone: z.string().optional(),
    notes: z.string().optional(),
    categoryId: z.string().optional(),
    color: z.string().optional(),
});

const CLIENT_COLORS = [
    { value: '', label: 'Brak', color: 'transparent' },
    { value: '#ef4444', label: 'Czerwony', color: '#ef4444' },
    { value: '#f97316', label: 'Pomarańczowy', color: '#f97316' },
    { value: '#eab308', label: 'Żółty', color: '#eab308' },
    { value: '#22c55e', label: 'Zielony', color: '#22c55e' },
    { value: '#3b82f6', label: 'Niebieski', color: '#3b82f6' },
    { value: '#8b5cf6', label: 'Fioletowy', color: '#8b5cf6' },
    { value: '#ec4899', label: 'Różowy', color: '#ec4899' },
    { value: '#6b7280', label: 'Szary', color: '#6b7280' },
];

interface EditClientDialogProps {
    client: Client & { category: ClientCategory | null };
    categories: ClientCategory[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({ client, categories, open, onOpenChange }: EditClientDialogProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: client.name || "",
            email: client.email || "",
            phone: client.phone || "",
            notes: client.notes || "",
            categoryId: client.categoryId?.toString() || "none",
            color: client.color || "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: client.name || "",
                email: client.email || "",
                phone: client.phone || "",
                notes: client.notes || "",
                categoryId: client.categoryId?.toString() || "none",
                color: client.color || "",
            });
        }
    }, [open, client, form]);

    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    async function handleCreateCategory() {
        if (!newCategoryName.trim()) return;
        try {
            const category = await createClientCategory(newCategoryName);
            setNewCategoryName("");
            setIsCreatingCategory(false);
            form.setValue("categoryId", category.id!.toString());
            toast.success("Kategoria dodana.");
        } catch (error) {
            console.error("Failed to create category:", error);
            toast.error("Błąd tworzenia kategorii.");
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await updateClient(client.id!, {
                name: values.name,
                email: values.email || undefined,
                phone: values.phone || undefined,
                notes: values.notes || undefined,
                categoryId: values.categoryId && values.categoryId !== 'none' ? parseInt(values.categoryId) : undefined,
                color: values.color || undefined,
            });
            onOpenChange(false);
            toast.success("Klient został zaktualizowany pomyślnie.");
        } catch (error) {
            console.error("Failed to update client:", error);
            toast.error("Wystąpił błąd podczas aktualizacji klienta.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edytuj Klienta</DialogTitle>
                    <DialogDescription>
                        Zmień dane klienta. Kliknij zapisz, gdy skończysz.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nazwa / Imię i Nazwisko</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Jan Kowalski" {...field} />
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
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="jan@example.com" {...field} />
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
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kolor oznaczenia</FormLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {CLIENT_COLORS.map((colorOption) => (
                                            <button
                                                key={colorOption.value}
                                                type="button"
                                                onClick={() => field.onChange(colorOption.value)}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${field.value === colorOption.value
                                                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                                        : 'hover:scale-105'
                                                    } ${colorOption.value === '' ? 'border-dashed border-gray-400' : 'border-white shadow-sm'}`}
                                                style={{ backgroundColor: colorOption.color }}
                                                title={colorOption.label}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Zapisz</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
