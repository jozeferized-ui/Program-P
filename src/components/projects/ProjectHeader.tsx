'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Client, Supplier, QuoteStatus, Employee, ProjectStatus } from '@/types';
import { EditProjectDialog } from './EditProjectDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar, DollarSign, User, ChevronDown, Truck, Trash2, ChevronRight, FileCheck, MapPin } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { updateProject, deleteProject } from '@/actions/projects';

interface ExtendedProject extends Project {
    employees?: Employee[];
}

interface ProjectHeaderProps {
    project: ExtendedProject;
    client?: Client;
    suppliers?: Supplier[];
    parentProject?: Project;
}

export function ProjectHeader({ project, client, suppliers, parentProject }: ProjectHeaderProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isFinalDeleteOpen, setIsFinalDeleteOpen] = useState(false);

    const assignedEmployees = project.employees || [];

    const handleDelete = async () => {
        try {
            if (project.id) {
                await deleteProject(project.id);
                toast.success("Projekt został usunięty pomyślnie.");
                router.push('/projects');
            }
        } catch (error) {
            console.error("Failed to delete project:", error);
            toast.error("Wystąpił błąd podczas usuwania projektu.");
        }
    };

    const handleStatusChange = async (status: ProjectStatus) => {
        if (!project.id) return;
        try {
            await updateProject(project.id, { status });
            toast.success(`Status zmieniony na: ${status}`);
            router.refresh();  // Odśwież UI
        } catch {
            toast.error("Błąd zmiany statusu.");
        }
    };

    const handleQuoteStatusChange = async (quoteStatus: QuoteStatus) => {
        if (!project.id) return;
        try {
            const updates: Partial<Project> = { quoteStatus };
            if (quoteStatus === 'Zaakceptowana') {
                updates.acceptedDate = new Date();
            }
            await updateProject(project.id, updates);
            toast.success(`Status oferty zmieniony na: ${quoteStatus}`);
            router.refresh();  // Odśwież UI
        } catch {
            toast.error("Błąd zmiany statusu oferty.");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    {parentProject && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Link href={`/projects/${parentProject.id}`} className="hover:underline hover:text-foreground transition-colors">
                                {parentProject.name}
                            </Link>
                            <ChevronRight className="h-4 w-4" />
                            <span className="font-medium text-foreground">{project.name}</span>
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                    <p className="text-muted-foreground">{project.description}</p>
                </div>

                <div className="flex items-center gap-2">
                    <EditProjectDialog project={project} />

                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setIsDeleteOpen(true)}
                        title="Usuń projekt"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-0 hover:bg-transparent">
                                <Badge className={cn(
                                    "w-fit text-base px-4 py-1 cursor-pointer flex items-center gap-2",
                                    project.status === 'Active' && "bg-green-600 hover:bg-green-700",
                                    project.status === 'Completed' && "bg-red-600 hover:bg-red-700",
                                    project.status === 'On Hold' && "bg-orange-600 hover:bg-orange-700",
                                    project.status === 'To Quote' && "bg-blue-600 hover:bg-blue-700",
                                    !['Active', 'Completed', 'On Hold', 'To Quote'].includes(project.status) && "bg-gray-500 hover:bg-gray-600"
                                )}>
                                    {project.status === 'Active' ? 'Aktywny' :
                                        project.status === 'Completed' ? 'Zakończony' :
                                            project.status === 'On Hold' ? 'Wstrzymany' :
                                                project.status === 'To Quote' ? 'Do Wyceny' : project.status}
                                    <ChevronDown className="h-4 w-4" />
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange('To Quote')}>
                                Do Wyceny
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('Active')}>
                                Aktywny
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('Completed')}>
                                Zakończony
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('On Hold')}>
                                Wstrzymany
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-0 hover:bg-transparent">
                                <Badge className={cn(
                                    "w-fit text-base px-4 py-1 cursor-pointer flex items-center gap-2",
                                    project.quoteStatus === 'Zaakceptowana' && "bg-green-600 hover:bg-green-700",
                                    project.quoteStatus === 'Niezaakceptowana' && "bg-red-600 hover:bg-red-700",
                                    project.quoteStatus === 'Do zmiany' && "bg-orange-600 hover:bg-orange-700",
                                    (!project.quoteStatus || project.quoteStatus === 'W trakcie') && "bg-blue-600 hover:bg-blue-700"
                                )}>
                                    <FileCheck className="h-4 w-4" />
                                    {project.quoteStatus || 'W trakcie'}
                                    <ChevronDown className="h-4 w-4" />
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleQuoteStatusChange('W trakcie')}>
                                W trakcie
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuoteStatusChange('Zaakceptowana')}>
                                Zaakceptowana
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuoteStatusChange('Niezaakceptowana')}>
                                Niezaakceptowana
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuoteStatusChange('Do zmiany')}>
                                Do zmiany
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* First Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Czy na pewno chcesz usunąć ten projekt?</DialogTitle>
                        <DialogDescription>
                            Ta operacja przeniesie projekt do kosza. Czy chcesz kontynuować?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Anuluj</Button>
                        <Button variant="destructive" onClick={() => {
                            setIsDeleteOpen(false);
                            setIsFinalDeleteOpen(true);
                        }}>Usuń</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Second (Final) Confirmation Dialog */}
            <Dialog open={isFinalDeleteOpen} onOpenChange={setIsFinalDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">OSTATECZNE POTWIERDZENIE</DialogTitle>
                        <DialogDescription>
                            To jest ostateczne ostrzeżenie. Usunięcie projektu jest nieodwracalne. Czy na pewno chcesz usunąć projekt <strong>{project.name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFinalDeleteOpen(false)}>Anuluj</Button>
                        <Button variant="destructive" onClick={handleDelete}>POTWIERDZAM USUNIĘCIE</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Klient</p>
                            <p className="text-lg font-bold">{client?.name || 'Nieznany'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                            <Truck className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Dostawcy</p>
                            <div className="flex flex-col">
                                {suppliers && suppliers.length > 0 ? (
                                    suppliers.map(supplier => (
                                        <p key={supplier.id} className="text-sm font-bold">{supplier.name}</p>
                                    ))
                                ) : (
                                    <p className="text-lg font-bold">Brak</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-full">
                            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Pracownicy</p>
                            <div className="flex flex-col">
                                {assignedEmployees && assignedEmployees.length > 0 ? (
                                    assignedEmployees.map(employee => (
                                        <p key={employee.id} className="text-sm font-bold">{employee.firstName} {employee.lastName}</p>
                                    ))
                                ) : (
                                    <p className="text-lg font-bold">Brak</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Wartość Projektu</p>
                            <p className="text-lg font-bold">
                                {project.totalValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} <span className="text-xs font-normal text-muted-foreground">netto</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                            <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                {project.status === 'To Quote' ? 'Termin Wyceny' : 'Termin Realizacji'}
                            </p>
                            <p className="text-sm font-bold">
                                {project.status === 'To Quote' ? (
                                    project.quoteDueDate ? format(new Date(project.quoteDueDate), 'd MMM yyyy', { locale: pl }) : 'Nie ustalono'
                                ) : (
                                    <>
                                        {project.startDate ? format(new Date(project.startDate), 'd MMM', { locale: pl }) : '?'}
                                        {' - '}
                                        {project.endDate ? format(new Date(project.endDate), 'd MMM yyyy', { locale: pl }) : '?'}
                                    </>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                            <MapPin className="h-5 w-5 text-red-600 dark:text-red-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Lokalizacja</p>
                            <p className="text-sm font-bold truncate max-w-[150px]" title={project.address}>
                                {project.address || 'Brak adresu'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div >
        </div >
    );
}
