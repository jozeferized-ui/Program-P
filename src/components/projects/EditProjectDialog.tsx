'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { getClients } from '@/actions/clients';
import { getSuppliers } from '@/actions/suppliers';
import { getEmployees } from '@/actions/employees';
import { updateProject, deleteProject } from '@/actions/projects';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Edit, X } from 'lucide-react';

interface EditProjectDialogProps {
    project: Project;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: '',
        clientId: '',
        supplierIds: [] as string[],
        startDate: '',
        endDate: '',
        quoteDueDate: '',
        totalValue: '',
        address: '',
        lat: '',
        lng: '',
        employeeIds: [] as string[],
        colorMarker: ''
    });

    const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
    const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
    const [employees, setEmployees] = useState<{ id: number; firstName: string; lastName: string }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [c, s, e] = await Promise.all([
                getClients(),
                getSuppliers(),
                getEmployees(),
            ]);
            setClients(c);
            setSuppliers(s);
            setEmployees(e);
        };
        if (open) fetchData();
    }, [open]);

    useEffect(() => {
        if (project && open) {
            setFormData({
                name: project.name,
                description: project.description || '',
                status: project.status,
                clientId: project.clientId.toString(),
                supplierIds: project.supplierIds?.map(id => id.toString()) || [],
                startDate: project.startDate ? format(project.startDate, 'yyyy-MM-dd') : '',
                endDate: project.endDate ? format(project.endDate, 'yyyy-MM-dd') : '',
                quoteDueDate: project.quoteDueDate ? format(project.quoteDueDate, 'yyyy-MM-dd') : '',
                totalValue: project.totalValue.toString(),
                address: project.address || '',
                lat: project.lat ? project.lat.toString() : '',
                lng: project.lng ? project.lng.toString() : '',
                employeeIds: project.employeeIds?.map(id => id.toString()) || [],
                colorMarker: project.colorMarker || ''
            });
        }
    }, [project, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updateProject(project.id!, {
                name: formData.name,
                description: formData.description,
                status: formData.status as any,
                clientId: parseInt(formData.clientId),
                supplierIds: formData.supplierIds.map(id => parseInt(id)),
                startDate: formData.startDate ? new Date(formData.startDate) : undefined,
                endDate: formData.endDate ? new Date(formData.endDate) : undefined,
                quoteDueDate: formData.quoteDueDate ? new Date(formData.quoteDueDate) : undefined,
                totalValue: parseFloat(formData.totalValue) || 0,
                address: formData.address,
                lat: formData.lat ? parseFloat(formData.lat) : undefined,
                lng: formData.lng ? parseFloat(formData.lng) : undefined,
                employeeIds: formData.employeeIds.map(id => parseInt(id)),
                colorMarker: formData.colorMarker || undefined
            });
            setOpen(false);
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edytuj Projekt
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edytuj Projekt</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nazwa Projektu</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="client">Klient</Label>
                        <Select
                            value={formData.clientId}
                            onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Wybierz klienta" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients?.map((client) => (
                                    <SelectItem key={client.id} value={client.id!.toString()}>
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Adres</Label>
                        <div className="flex gap-2">
                            <Input
                                id="address"
                                placeholder="ul. Przykładowa 1, Warszawa"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={async () => {
                                    if (!formData.address) return;
                                    try {
                                        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`);
                                        const data = await response.json();
                                        if (data && data.length > 0) {
                                            setFormData({
                                                ...formData,
                                                lat: data[0].lat,
                                                lng: data[0].lon
                                            });
                                        } else {
                                            alert('Nie znaleziono adresu.');
                                        }
                                    } catch (error) {
                                        console.error('Geocoding error:', error);
                                        alert('Błąd podczas wyszukiwania adresu.');
                                    }
                                }}
                            >
                                Znajdź
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="lat">Szerokość (Lat)</Label>
                            <Input
                                id="lat"
                                type="number"
                                placeholder="52.2297"
                                value={formData.lat}
                                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lng">Długość (Lng)</Label>
                            <Input
                                id="lng"
                                type="number"
                                placeholder="21.0122"
                                value={formData.lng}
                                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Dostawcy (Opcjonalnie)</Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                            {suppliers?.map((supplier) => (
                                <div key={supplier.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`edit-supplier-${supplier.id}`}
                                        checked={formData.supplierIds.includes(supplier.id!.toString())}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            const value = supplier.id!.toString();
                                            if (checked) {
                                                setFormData({
                                                    ...formData,
                                                    supplierIds: [...formData.supplierIds, value]
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    supplierIds: formData.supplierIds.filter((v) => v !== value)
                                                });
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label
                                        htmlFor={`edit-supplier-${supplier.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {supplier.name}
                                    </label>
                                </div>
                            ))}
                            {suppliers?.length === 0 && (
                                <p className="text-sm text-muted-foreground">Brak dostawców.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Przypisani Pracownicy</Label>
                        <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                            {employees?.map((employee) => (
                                <div key={employee.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`edit-employee-${employee.id}`}
                                        checked={formData.employeeIds.includes(employee.id!.toString())}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            const value = employee.id!.toString();
                                            if (checked) {
                                                setFormData({
                                                    ...formData,
                                                    employeeIds: [...formData.employeeIds, value]
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    employeeIds: formData.employeeIds.filter((v) => v !== value)
                                                });
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label
                                        htmlFor={`edit-employee-${employee.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {employee.firstName} {employee.lastName}
                                    </label>
                                </div>
                            ))}
                            {employees?.length === 0 && (
                                <p className="text-sm text-muted-foreground">Brak aktywnych pracowników.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Wybierz status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="To Quote">Do Wyceny</SelectItem>
                                <SelectItem value="Active">Aktywny</SelectItem>
                                <SelectItem value="On Hold">Wstrzymany</SelectItem>
                                <SelectItem value="Completed">Zakończony</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.status === 'To Quote' && (
                        <div className="space-y-2">
                            <Label htmlFor="quoteDueDate">Termin Wyceny</Label>
                            <Input
                                id="quoteDueDate"
                                type="date"
                                value={formData.quoteDueDate}
                                onChange={(e) => setFormData({ ...formData, quoteDueDate: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Data Rozpoczęcia</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Data Zakończenia</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="totalValue">Wartość Projektu (PLN)</Label>
                        <Input
                            id="totalValue"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.totalValue}
                            onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Opis</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Znacznik Koloru</Label>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                                    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
                                    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
                                    '#ec4899', '#f43f5e', '#78716c', '#374151', '#1e293b'
                                ].map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${formData.colorMarker === color
                                                ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                                                : 'border-transparent'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData({ ...formData, colorMarker: color })}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="customColor" className="text-sm whitespace-nowrap">Własny kolor:</Label>
                                    <Input
                                        id="customColor"
                                        type="color"
                                        value={formData.colorMarker || '#3b82f6'}
                                        onChange={(e) => setFormData({ ...formData, colorMarker: e.target.value })}
                                        className="w-12 h-10 p-1 cursor-pointer"
                                    />
                                </div>
                                {formData.colorMarker && (
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-10 h-10 rounded-lg border-2 border-muted"
                                            style={{ backgroundColor: formData.colorMarker }}
                                        />
                                        <span className="text-sm text-muted-foreground">{formData.colorMarker}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setFormData({ ...formData, colorMarker: '' })}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={async () => {
                                if (confirm("Czy na pewno chcesz usunąć ten projekt?")) {
                                    try {
                                        await deleteProject(project.id!);
                                        setOpen(false);
                                    } catch (error) {
                                        console.error("Failed to delete project:", error);
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
            </DialogContent>
        </Dialog>
    );
}
