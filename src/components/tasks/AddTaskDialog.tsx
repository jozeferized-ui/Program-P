'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { createTask } from '@/actions/tasks';
import { createOrder } from '@/actions/orders';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { OrderTemplate } from '@/types';

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Tytuł zadania musi mieć co najmniej 2 znaki.",
    }),
    description: z.string().optional(),
    priority: z.enum(['Low', 'Medium', 'High']),
    dueDate: z.string().optional(),
    orderTemplateId: z.string().optional(),
});

interface AddTaskDialogProps {
    projectId: number;
    orderTemplates?: OrderTemplate[];
}

export function AddTaskDialog({ projectId, orderTemplates = [] }: AddTaskDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            priority: "Medium",
            dueDate: "",
            orderTemplateId: "none",
        },
    });

    const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState("");

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        setChecklistItems([...checklistItems, { id: crypto.randomUUID(), text: newChecklistItem, completed: false }]);
        setNewChecklistItem("");
    };

    const removeChecklistItem = (id: string) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id));
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const task = await createTask({
                projectId,
                title: values.title,
                description: values.description || undefined,
                status: 'Todo',
                priority: values.priority as 'Low' | 'Medium' | 'High',
                dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
                checklist: checklistItems,
                createdAt: new Date(),
            });

            // If order template selected, create order
            if (values.orderTemplateId && values.orderTemplateId !== 'none') {
                const template = orderTemplates.find(t => t.id === parseInt(values.orderTemplateId!));
                if (template) {
                    await createOrder({
                        projectId,
                        taskId: task.id, // Prisma task ID
                        title: `Zamówienie: ${template.title}`,
                        amount: template.defaultAmount,
                        status: 'Pending',
                        date: new Date(),
                        supplierId: undefined // Or handle supplier if template has one
                    });
                }
            }

            toast.success("Zadanie dodane pomyślnie.");
            setOpen(false);
            form.reset();
            setChecklistItems([]);
        } catch (error) {
            console.error("Failed to add task:", error);
            toast.error("Błąd dodawania zadania.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj Zadanie
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Dodaj Nowe Zadanie</DialogTitle>
                    <DialogDescription>
                        Co jest do zrobienia?
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tytuł</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Naprawić błąd..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Priorytet</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz priorytet" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Low">Niski</SelectItem>
                                            <SelectItem value="Medium">Średni</SelectItem>
                                            <SelectItem value="High">Wysoki</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Termin</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
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
                                        <Textarea placeholder="Szczegóły zadania..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                            <FormLabel>Lista dla ekipy (Co zabrać/zrobić)</FormLabel>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Co zabrać / zrobić?"
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addChecklistItem();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addChecklistItem}>
                                    Dodaj
                                </Button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {checklistItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                        <span className="text-sm">{item.text}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => removeChecklistItem(item.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="orderTemplateId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dołącz Zamówienie (Opcjonalne)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz szablon zamówienia" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Brak</SelectItem>
                                            {orderTemplates?.map((template) => (
                                                <SelectItem key={template.id} value={template.id!.toString()}>
                                                    {template.title} ({template.defaultAmount} PLN)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
