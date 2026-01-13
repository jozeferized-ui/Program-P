"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WarehouseItem } from "@/types";

const UNIT_OPTIONS = ['szt.', 'm².', 'mb.', 'kpl.', 'doba', 'rbh'] as const;

const formSchema = z.object({
    name: z.string().min(1, "Nazwa jest wymagana"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0, "Ilość musi być większa lub równa 0"),
    unit: z.string().min(1, "Jednostka jest wymagana"),
    minQuantity: z.coerce.number().min(0, "Minimalna ilość musi być większa lub równa 0").optional(),
    category: z.string().optional(),
    location: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddWarehouseItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: FormValues) => void;
    initialData?: WarehouseItem;
}

export function AddWarehouseItemDialog({ open, onOpenChange, onSubmit, initialData }: AddWarehouseItemDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            quantity: 0,
            unit: "szt.",
            minQuantity: 0,
            category: "",
            location: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                description: initialData.description || "",
                quantity: initialData.quantity,
                unit: initialData.unit,
                minQuantity: initialData.minQuantity || 0,
                category: initialData.category || "",
                location: initialData.location || "",
            });
        } else {
            form.reset({
                name: "",
                description: "",
                quantity: 0,
                unit: "szt.",
                minQuantity: 0,
                category: "",
                location: "",
            });
        }
    }, [initialData, form, open]);

    const handleSubmit = (values: FormValues) => {
        onSubmit(values);
        onOpenChange(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edytuj przedmiot" : "Dodaj przedmiot"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nazwa</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nazwa przedmiotu" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Opis</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Opis przedmiotu" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ilość</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={e => field.onChange(e.target.valueAsNumber)}
                                                value={field.value}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jednostka</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wybierz jednostkę" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {UNIT_OPTIONS.map((unit) => (
                                                    <SelectItem key={unit} value={unit}>
                                                        {unit}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="minQuantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Minimalna ilość (alarm)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            onChange={e => field.onChange(e.target.valueAsNumber)}
                                            value={field.value ?? 0}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kategoria</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Kategoria" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lokalizacja</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Lokalizacja w magazynie" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Zapisz</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
