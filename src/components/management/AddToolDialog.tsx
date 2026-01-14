"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tool, Employee, ToolCategory } from "@/types";
import { format, addMonths } from "date-fns";
import { Label } from "@/components/ui/label";
import { getToolCategories } from "@/actions/toolCategories";

const formSchema = z.object({
    name: z.string().min(1, "Nazwa jest wymagana"),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    status: z.enum(["Available", "In Use", "Maintenance", "Lost"]),
    price: z.coerce.number().min(0, "Cena musi być większa lub równa 0"),
    purchaseDate: z.date(),
    employeeIds: z.array(z.number()).default([]),
    lastInspectionDate: z.date().optional(),
    protocolNumber: z.string().optional(),
    categoryId: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddToolDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => void;
    initialData?: Tool;
    employees: Employee[];
}

export function AddToolDialog({ open, onOpenChange, onSubmit, initialData, employees }: AddToolDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            brand: "",
            model: "",
            serialNumber: "",
            status: "Available",
            price: 0,
            purchaseDate: new Date(),
            employeeIds: [],
            lastInspectionDate: undefined,
            protocolNumber: "",
        },
    });

    // Watch lastInspectionDate to update expiry preview
    const lastInspectionDate = form.watch("lastInspectionDate");
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
    const [inspectionInterval, setInspectionInterval] = useState<string>("6");
    const [categories, setCategories] = useState<ToolCategory[]>([]);

    useEffect(() => {
        getToolCategories().then(setCategories);
    }, []);

    useEffect(() => {
        if (lastInspectionDate) {
            setExpiryDate(addMonths(new Date(lastInspectionDate), parseInt(inspectionInterval)));
        } else {
            setExpiryDate(undefined);
        }
    }, [lastInspectionDate, inspectionInterval]);

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                brand: initialData.brand || "",
                model: initialData.model || "",
                serialNumber: initialData.serialNumber || "",
                status: initialData.status as "Available" | "In Use" | "Maintenance" | "Lost",
                price: initialData.price,
                purchaseDate: new Date(initialData.purchaseDate),
                employeeIds: initialData.assignedEmployees?.map(e => e.id!) || [],
                lastInspectionDate: initialData.lastInspectionDate ? new Date(initialData.lastInspectionDate) : undefined,
                protocolNumber: initialData.protocolNumber || "",
                categoryId: initialData.categoryId || undefined,
            });
            // Try to guess interval or default to 6 in input
            if (initialData.lastInspectionDate && initialData.inspectionExpiryDate) {
                const diffMonths = Math.round((new Date(initialData.inspectionExpiryDate).getTime() - new Date(initialData.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                if (diffMonths > 0) {
                    setInspectionInterval(diffMonths.toString());
                } else {
                    setInspectionInterval("6");
                }
            }
        } else {
            form.reset({
                name: "",
                brand: "",
                model: "",
                serialNumber: "",
                status: "Available",
                price: 0,
                purchaseDate: new Date(),
                employeeIds: [],
                lastInspectionDate: undefined,
                protocolNumber: "",
                categoryId: undefined,
            });
            setInspectionInterval("6");
        }
    }, [initialData, open]);

    const handleSubmit = (values: FormValues) => {
        const submissionData = {
            ...values,
            inspectionExpiryDate: values.lastInspectionDate ? addMonths(new Date(values.lastInspectionDate), parseInt(inspectionInterval)) : undefined,
            // Ensure dates are actual Date objects or ISO strings if needed by action, though Zod handles them as Dates
        };
        onSubmit(submissionData);
        onOpenChange(false);
        form.reset();
    };

    const toggleEmployee = (employeeId: number) => {
        const currentIds = form.getValues("employeeIds");
        if (currentIds.includes(employeeId)) {
            form.setValue("employeeIds", currentIds.filter(id => id !== employeeId));
        } else {
            form.setValue("employeeIds", [...currentIds, employeeId]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edytuj narzędzie" : "Dodaj narzędzie"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nazwa</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Wiertarka" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marka</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Makita" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model</FormLabel>
                                        <FormControl>
                                            <Input placeholder="DHR242" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="serialNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Numer Seryjny</FormLabel>
                                    <FormControl>
                                        <Input placeholder="SN123456" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Category dropdown with inline creation */}
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategoria</FormLabel>
                                    <div className="flex gap-2">
                                        <Select
                                            value={field.value?.toString() || "none"}
                                            onValueChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Wybierz kategorię" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Brak kategorii</SelectItem>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id!.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: cat.color }}
                                                            />
                                                            {cat.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <Input
                                            placeholder="Nowa kategoria..."
                                            id="newCategoryName"
                                            className="flex-1 h-8 text-sm"
                                        />
                                        <input
                                            type="color"
                                            id="newCategoryColor"
                                            defaultValue="#059669"
                                            className="h-8 w-10 border rounded cursor-pointer"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                const nameInput = document.getElementById('newCategoryName') as HTMLInputElement;
                                                const colorInput = document.getElementById('newCategoryColor') as HTMLInputElement;
                                                if (nameInput?.value) {
                                                    const { createToolCategory } = await import('@/actions/toolCategories');
                                                    const result = await createToolCategory(nameInput.value, colorInput?.value || '#059669');
                                                    if (result.success && result.data) {
                                                        setCategories(prev => [...prev, result.data as ToolCategory]);
                                                        field.onChange(result.data.id);
                                                        nameInput.value = '';
                                                    }
                                                }
                                            }}
                                        >
                                            Dodaj
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">

                            <FormField
                                control={form.control}
                                name="purchaseDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data Zakupu</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                                onChange={(e) => field.onChange(new Date(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cena (PLN)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={e => field.onChange(e.target.valueAsNumber)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Inspection Details - only show when editing existing tool */}
                        {initialData && (
                            <div className="border rounded-md p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-sm">Szczegóły Przeglądu</h3>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="interval-select" className="text-xs text-muted-foreground">Ważność (miesiące):</Label>
                                        <Select value={inspectionInterval} onValueChange={setInspectionInterval}>
                                            <SelectTrigger className="w-[80px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="6">6</SelectItem>
                                                <SelectItem value="12">12</SelectItem>
                                                <SelectItem value="24">24</SelectItem>
                                                <SelectItem value="36">36</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="protocolNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Numer Protokołu</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="PROT/2026/01" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastInspectionDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data Ostatniego Przeglądu</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {expiryDate && (
                                    <div className="text-sm font-medium">
                                        <span className="text-muted-foreground mr-2">Ważność przeglądu (do):</span>
                                        <span className={expiryDate < new Date() ? "text-red-500" : "text-green-600"}>
                                            {format(expiryDate, "dd.MM.yyyy")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wybierz status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Available">Dostępne</SelectItem>
                                                <SelectItem value="In Use">W użyciu</SelectItem>
                                                <SelectItem value="Maintenance">Serwis</SelectItem>
                                                <SelectItem value="Lost">Zgubione</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Multiple Employee Selection */}
                        <div className="space-y-2">
                            <FormLabel>Przypisane Osoby</FormLabel>
                            <ScrollArea className="h-[150px] w-full border rounded-md p-4">
                                <div className="space-y-2">
                                    {employees.map((employee) => (
                                        <div key={employee.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`employee-${employee.id}`}
                                                checked={form.watch("employeeIds").includes(employee.id!)}
                                                onCheckedChange={() => toggleEmployee(employee.id!)}
                                            />
                                            <Label htmlFor={`employee-${employee.id}`} className="text-sm font-normal cursor-pointer">
                                                {employee.firstName} {employee.lastName}
                                            </Label>
                                        </div>
                                    ))}
                                    {employees.length === 0 && (
                                        <p className="text-sm text-muted-foreground">Brak pracowników do przypisania.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                                Anuluj
                            </Button>
                            <Button type="submit">
                                {initialData ? "Zapisz zmiany" : "Dodaj narzędzie"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
