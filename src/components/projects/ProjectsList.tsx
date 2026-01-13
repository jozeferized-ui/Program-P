'use client';

import Link from 'next/link';
import { Project, Client, Supplier, Employee } from '@/types';
import { AddProjectDialog } from '@/components/projects/AddProjectDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, DollarSign, User, FolderTree } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ExtendedProject extends Project {
    client?: Client;
    subProjects?: Project[];
}

interface ProjectsListProps {
    initialProjects: ExtendedProject[];
    clients: Client[];
    suppliers: Supplier[];
    employees: Employee[];
}

export function ProjectsList({ initialProjects, clients, suppliers, employees }: ProjectsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');

    // Filter out subprojects from the main list (they are shown inside parent projects)
    const mainProjects = initialProjects.filter(p => !p.parentProjectId);

    const filteredProjects = mainProjects.filter(project => {
        const clientName = project.client?.name || 'Nieznany';
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            clientName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        const matchesClient = clientFilter === 'all' || project.clientId.toString() === clientFilter;
        return matchesSearch && matchesStatus && matchesClient;
    }).sort((a, b) => {
        // Always sort by status priority
        const statusPriority: Record<string, number> = {
            'To Quote': 0, // Highest priority
            'Active': 1,
            'On Hold': 2,
            'Completed': 3
        };
        const priorityA = statusPriority[a.status] !== undefined ? statusPriority[a.status] : 99;
        const priorityB = statusPriority[b.status] !== undefined ? statusPriority[b.status] : 99;
        return priorityA - priorityB;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Projekty</h1>
                <AddProjectDialog
                    clients={clients}
                    suppliers={suppliers}
                    employees={employees}
                    projects={initialProjects} // Pass all projects for parent selection
                />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Szukaj projektu lub klienta..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <SelectValue placeholder="Status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Wszystkie</SelectItem>
                        <SelectItem value="To Quote">Do Wyceny</SelectItem>
                        <SelectItem value="Active">Aktywne</SelectItem>
                        <SelectItem value="Completed">Zakończone</SelectItem>
                        <SelectItem value="On Hold">Wstrzymane</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-[180px]">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <SelectValue placeholder="Klient" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Wszyscy klienci</SelectItem>
                        {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id?.toString() || ""}>
                                {client.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => {
                    const subprojectCount = project.subProjects?.length || 0;
                    const subprojectsPreview = project.subProjects || [];
                    const clientName = project.client?.name || 'Nieznany';

                    return (
                        <Link href={`/projects/${project.id}`} key={project.id}>
                            <Card className={cn(
                                "transition-all cursor-pointer h-full border-2 flex flex-col justify-between",
                                // Default styles
                                !subprojectCount && project.status === 'Active' && "border-green-500/50 bg-green-50/50 dark:bg-green-900/20 hover:border-green-500 hover:bg-green-100/50 dark:hover:bg-green-900/30",
                                !subprojectCount && project.status === 'Completed' && "border-red-500/50 bg-red-50/50 dark:bg-red-900/20 hover:border-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30",
                                !subprojectCount && project.status === 'On Hold' && "border-orange-500/50 bg-orange-50/50 dark:bg-orange-900/20 hover:border-orange-500 hover:bg-orange-100/50 dark:hover:bg-orange-900/30",
                                !subprojectCount && project.status === 'To Quote' && "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100/50 dark:hover:bg-blue-900/30",
                                !subprojectCount && !['Active', 'Completed', 'On Hold', 'To Quote'].includes(project.status) && "hover:bg-gray-50 dark:hover:bg-gray-800/50",

                                // Distinct style for projects with subprojects (Main Projects)
                                subprojectCount > 0 && "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 shadow-md"
                            )}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-2 truncate pr-2 flex-1">
                                        {project.colorMarker && (
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white dark:ring-gray-800 shadow-sm"
                                                style={{ backgroundColor: project.colorMarker }}
                                                title="Znacznik projektu"
                                            />
                                        )}
                                        <CardTitle className="text-base font-medium truncate">
                                            {project.name}
                                        </CardTitle>
                                    </div>
                                    <Badge className={cn(
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
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span>{clientName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            <span>{project.totalValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {project.endDate ? format(new Date(project.endDate), 'd MMM yyyy', { locale: pl }) : 'Brak daty'}
                                            </span>
                                        </div>

                                        {/* Subprojects Preview Section */}
                                        {subprojectCount > 0 && (
                                            <div className="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-800/50">
                                                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-1">
                                                    <FolderTree className="h-3 w-3" />
                                                    Etapy ({subprojectCount}):
                                                </p>
                                                <div className="space-y-1.5">
                                                    {subprojectsPreview.slice(0, 3).map(sub => (
                                                        <div key={sub.id} className="text-xs text-muted-foreground flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1 rounded">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                sub.status === 'Completed' ? 'bg-green-500' :
                                                                    sub.status === 'Active' ? 'bg-blue-500' :
                                                                        sub.status === 'On Hold' ? 'bg-orange-500' : 'bg-gray-400'
                                                            )} />
                                                            <span className="truncate">{sub.name}</span>
                                                        </div>
                                                    ))}
                                                    {subprojectCount > 3 && (
                                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 italic pl-1">
                                                            + {subprojectCount - 3} więcej...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
                {filteredProjects.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Nie znaleziono projektów spełniających kryteria.
                    </div>
                )}
            </div>
        </div>
    );
}
