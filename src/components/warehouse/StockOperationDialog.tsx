import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { WarehouseItem } from "@/types";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const formSchema = z.object({
    quantity: z.coerce.number().min(0.01, "Ilość musi być większa od 0"),
    reason: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StockOperationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (itemId: number, quantity: number, type: 'IN' | 'OUT', reason?: string) => void;
    item?: WarehouseItem;
    type: 'IN' | 'OUT';
}

export function StockOperationDialog({ open, onOpenChange, onSubmit, item, type }: StockOperationDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any, // Cast to any to avoid strict type mismatch with hook-form resolver
        defaultValues: {
            quantity: 0,
            reason: "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                quantity: 0,
                reason: "",
            });
        }
    }, [open, form]);

    const handleSubmit = (values: FormValues) => {
        if (item?.id) {
            onSubmit(item.id, values.quantity, type, values.reason);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {type === 'IN' ? (
                            <>
                                <ArrowDownCircle className="h-5 w-5 text-green-600" />
                                Przyjęcie na stan (PZ)
                            </>
                        ) : (
                            <>
                                <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                                Wydanie z magazynu (WZ)
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="mb-4 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium">{item?.name}</p>
                        <p className="text-xs text-muted-foreground">Obecny stan: {item?.quantity} {item?.unit}</p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ilość do {type === 'IN' ? 'przyjęcia' : 'wydania'}</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    onChange={e => field.onChange(e.target.valueAsNumber)}
                                                    className="text-lg font-bold"
                                                />
                                                <span className="text-sm font-medium text-muted-foreground w-12">
                                                    {item?.unit}
                                                </span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Uwagi / Powód</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={type === 'IN' ? "np. Dostawa od producenta" : "np. Wydanie do projektu X"}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="submit" variant={type === 'IN' ? "default" : "secondary"}>
                                    {type === 'IN' ? 'Przyjmij na stan' : 'Wydaj z magazynu'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
