'use client';

import { useState } from 'react';
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
import { Plus } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createProject } from '@/actions/projects';
import { Client, Supplier, Employee, Project } from '@/types';

const projectSchema = z.object({
    name: z.string().min(2, "Nazwa projektu musi mieć co najmniej 2 znaki."),
    clientId: z.string().min(1, "Wybierz klienta."),
    status: z.enum(['Active', 'Completed', 'On Hold', 'To Quote']),
    description: z.string().optional(),
    totalValue: z.number().min(0, "Wartość musi być dodatnia."),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    supplierIds: z.array(z.string()).optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    employeeIds: z.array(z.string()).optional(),
    colorMarker: z.string().optional(),
});

// Loose schema for optional parent fields
const looseProjectSchema = z.object({
    name: z.string().optional(),
    clientId: z.string().optional(),
    status: z.enum(['Active', 'Completed', 'On Hold', 'To Quote']).optional(),
    description: z.string().optional(),
    totalValue: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    supplierIds: z.array(z.string()).optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    employeeIds: z.array(z.string()).optional(),
    colorMarker: z.string().optional(),
});

// Extended schema for the form
const formSchema = z.object({
    mode: z.enum(['single', 'subproject']),
    parentMode: z.enum(['existing', 'new']),
    existingParentId: z.string().optional(),

    // Target Project (or Single Project)
    target: projectSchema,

    // New Parent Project (only if mode=subproject && parentMode=new)
    parent: looseProjectSchema.optional(),
}).superRefine((data, ctx) => {
    if (data.mode === 'subproject') {
        if (data.parentMode === 'new') {
            if (!data.parent) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Dane nowego projektu głównego są wymagane.",
                    path: ["parent"],
                });
            } else {
                const result = projectSchema.safeParse(data.parent);
                if (!result.success) {
                    result.error.issues.forEach((issue) => {
                        ctx.addIssue({
                            ...issue,
                            path: ["parent", ...issue.path],
                        });
                    });
                }
            }
        } else if (data.parentMode === 'existing') {
            if (!data.existingParentId || data.existingParentId === 'none') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Wybierz projekt główny.",
                    path: ["existingParentId"],
                });
            }
        }
    }
});

interface AddProjectDialogProps {
    defaultParentId?: number;
    defaultParentName?: string;
    clients: Client[];
    suppliers: Supplier[];
    employees: Employee[];
    projects: Project[];
}

export function AddProjectDialog({ defaultParentId, defaultParentName, clients, suppliers, employees, projects }: AddProjectDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mode: defaultParentId ? 'subproject' : 'single',
            parentMode: 'existing',
            existingParentId: defaultParentId ? defaultParentId.toString() : 'none',
            target: {
                name: "",
                clientId: "",
                status: "Active",
                description: "",
                totalValue: 0,
                startDate: "",
                endDate: "",
                supplierIds: [],
                address: "",
                lat: undefined,
                lng: undefined,
                employeeIds: [],
                colorMarker: "",
            },
            parent: {
                name: "",
                clientId: "",
                status: "Active",
                description: "",
                totalValue: 0,
                startDate: "",
                endDate: "",
                supplierIds: [],
                address: "",
                lat: undefined,
                lng: undefined,
                employeeIds: [],
                colorMarker: "",
            }
        },
    });

    const mode = form.watch('mode');
    const parentMode = form.watch('parentMode');

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            let parentId: number | undefined = undefined;

            // 1. Handle Parent Project Creation or Selection
            if (values.mode === 'subproject') {
                if (values.parentMode === 'new' && values.parent) {
                    // Create new parent
                    const parent = await createProject({
                        name: values.parent.name!,
                        clientId: parseInt(values.parent.clientId!),
                        status: values.parent.status as any,
                        description: values.parent.description || undefined,
                        totalValue: values.parent.totalValue!,
                        startDate: values.parent.startDate ? new Date(values.parent.startDate) : undefined,
                        endDate: values.parent.endDate ? new Date(values.parent.endDate) : undefined,
                        supplierIds: values.parent.supplierIds?.map(id => parseInt(id)),
                        createdAt: new Date(),
                        address: values.parent.address,
                        lat: values.parent.lat,
                        lng: values.parent.lng,
                        employeeIds: values.parent.employeeIds?.map(id => parseInt(id)),
                        colorMarker: values.parent.colorMarker || undefined,
                    });
                    parentId = parent.id;
                } else if (values.parentMode === 'existing' && values.existingParentId !== 'none') {
                    parentId = parseInt(values.existingParentId!);
                }
            }

            // 2. Create Target Project
            await createProject({
                name: values.target.name,
                clientId: parseInt(values.target.clientId),
                parentProjectId: parentId,
                status: values.target.status as any,
                description: values.target.description || undefined,
                totalValue: values.target.totalValue,
                startDate: values.target.startDate ? new Date(values.target.startDate) : undefined,
                endDate: values.target.endDate ? new Date(values.target.endDate) : undefined,
                supplierIds: values.target.supplierIds?.map(id => parseInt(id)),
                createdAt: new Date(),
                address: values.target.address,
                lat: values.target.lat,
                lng: values.target.lng,
                employeeIds: values.target.employeeIds?.map(id => parseInt(id)),
                colorMarker: values.target.colorMarker || undefined,
            });

            setOpen(false);
            form.reset();
            toast.success("Projekt został dodany pomyślnie.");
        } catch (error) {
            console.error("Failed to add project:", error);
            toast.error("Wystąpił błąd podczas dodawania projektu.");
        }
    }

    const renderProjectFields = (prefix: 'target' | 'parent', title: string) => (
        <div className="space-y-4 border p-4 rounded-md bg-muted/20">
            <h3 className="font-semibold text-lg">{title}</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                    control={form.control}
                    name={`${prefix}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nazwa Projektu</FormLabel>
                            <FormControl>
                                <Input placeholder="Np. Budowa Domu" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`${prefix}.clientId`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Klient</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wybierz" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {clients?.map((client) => (
                                        <SelectItem key={client.id} value={client.id?.toString() || ""}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`${prefix}.status`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="To Quote">Do Wyceny</SelectItem>
                                    <SelectItem value="Active">Aktywny</SelectItem>
                                    <SelectItem value="On Hold">Wstrzymany</SelectItem>
                                    <SelectItem value="Completed">Zakończony</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`${prefix}.colorMarker`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Znacznik</FormLabel>
                            <FormControl>
                                <div className="flex flex-wrap gap-1.5">
                                    {['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'].map((color) => (
                                        <button
                                            key={color || 'none'}
                                            type="button"
                                            onClick={() => field.onChange(color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${field.value === color
                                                    ? 'ring-2 ring-offset-1 ring-primary scale-110'
                                                    : 'hover:scale-105'
                                                } ${!color ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                                            style={color ? { backgroundColor: color } : undefined}
                                            title={color ? color : 'Brak znacznika'}
                                        >
                                            {!color && <span className="text-[10px] text-gray-500">✕</span>}
                                        </button>
                                    ))}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name={`${prefix}.startDate`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`${prefix}.endDate`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Koniec</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`${prefix}.totalValue`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Wartość (PLN netto)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <FormField
                        control={form.control}
                        name={`${prefix}.address`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adres</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input placeholder="ul. Przykładowa 1, Warszawa" {...field} />
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        onClick={async () => {
                                            const address = form.getValues(`${prefix}.address`);
                                            if (!address) return;
                                            try {
                                                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
                                                const data = await response.json();
                                                if (data && data.length > 0) {
                                                    form.setValue(`${prefix}.lat`, parseFloat(data[0].lat));
                                                    form.setValue(`${prefix}.lng`, parseFloat(data[0].lon));
                                                    toast.success("Znaleziono współrzędne!");
                                                } else {
                                                    toast.error('Nie znaleziono adresu.');
                                                }
                                            } catch (error) {
                                                console.error('Geocoding error:', error);
                                                toast.error('Błąd podczas wyszukiwania adresu.');
                                            }
                                        }}
                                    >
                                        <span className="sr-only">Znajdź</span>
                                        📍
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name={`${prefix}.lat`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Lat</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="52.2297"
                                            className="h-8"
                                            {...field}
                                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`${prefix}.lng`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Lng</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="21.0122"
                                            className="h-8"
                                            {...field}
                                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <FormField
                        control={form.control}
                        name={`${prefix}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Opis</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Opcjonalny opis..." className="h-[108px] resize-none" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <FormField
                control={form.control}
                name={`${prefix}.employeeIds`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Przypisani Pracownicy</FormLabel>
                        <FormControl>
                            <div className="flex flex-wrap gap-2 border rounded-md p-2 max-h-[100px] overflow-y-auto">
                                {employees?.map(employee => (
                                    <div key={employee.id} className="flex items-center space-x-2 bg-background border rounded px-2 py-1">
                                        <input
                                            type="checkbox"
                                            id={`employee-${prefix}-${employee.id}`}
                                            checked={(field.value as string[])?.includes(employee.id!.toString())}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                const current = (field.value as string[]) || [];
                                                if (checked) {
                                                    field.onChange([...current, employee.id!.toString()]);
                                                } else {
                                                    field.onChange(current.filter((id: string) => id !== employee.id!.toString()));
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label
                                            htmlFor={`employee-${prefix}-${employee.id}`}
                                            className="text-xs font-medium leading-none cursor-pointer"
                                        >
                                            {employee.firstName} {employee.lastName}
                                        </label>
                                    </div>
                                ))}
                                {employees?.length === 0 && (
                                    <span className="text-sm text-muted-foreground">Brak aktywnych pracowników.</span>
                                )}
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {defaultParentId ? "Dodaj Podprojekt" : "Dodaj Projekt"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{defaultParentId && defaultParentName ? `Dodaj Podprojekt do ${defaultParentName}` : "Dodaj Nowy Projekt"}</DialogTitle>
                    <DialogDescription>
                        {defaultParentId ? "Skonfiguruj nowy etap projektu." : "Skonfiguruj strukturę projektu."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Mode Selection - Only show if NO default parent */}
                        {!defaultParentId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="mode"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3 border p-3 rounded-md">
                                            <FormLabel>Rodzaj Projektu</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-row space-x-4"
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="single" />
                                                        </FormControl>
                                                        <Label className="font-normal">
                                                            Pojedynczy
                                                        </Label>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="subproject" />
                                                        </FormControl>
                                                        <Label className="font-normal">
                                                            Podprojekt
                                                        </Label>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {mode === 'subproject' && (
                                    <FormField
                                        control={form.control}
                                        name="parentMode"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3 border p-3 rounded-md">
                                                <FormLabel>Projekt Główny</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex flex-row space-x-4"
                                                    >
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="existing" />
                                                            </FormControl>
                                                            <Label className="font-normal">Istniejący</Label>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <RadioGroupItem value="new" />
                                                            </FormControl>
                                                            <Label className="font-normal">Nowy</Label>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        )}

                        {!defaultParentId && mode === 'subproject' && parentMode === 'existing' && (
                            <FormField
                                control={form.control}
                                name="existingParentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wybierz projekt główny" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Wybierz...</SelectItem>
                                                {projects?.map((project) => (
                                                    <SelectItem key={project.id} value={project.id?.toString() || ""}>
                                                        {project.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {!defaultParentId && mode === 'subproject' && parentMode === 'new' && (
                            renderProjectFields('parent', 'Nowy Projekt Główny')
                        )}

                        {renderProjectFields('target', mode === 'single' ? 'Szczegóły Projektu' : 'Szczegóły Podprojektu')}

                        <DialogFooter>
                            <Button type="submit">Zapisz</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
