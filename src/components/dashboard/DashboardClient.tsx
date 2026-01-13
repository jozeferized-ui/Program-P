'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, ShoppingCart, CheckSquare, Calendar, ArrowUpDown, AlertCircle, ShieldAlert, Hammer } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { Type } from 'lucide-react';
import ProjectTimeline from '@/components/dashboard/ProjectTimeline';
import { Project, Task, Order, ProjectStatus } from '@/types';

const ProjectMap = dynamic(() => import('@/components/dashboard/ProjectMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-md" />
});

interface DashboardStats {
    activeProjects: number;
    pendingTasks: (Task & { projectName: string })[];
    pendingOrders: (Order & { projectName: string; supplierName: string })[];
    recentProjects: (Project & {
        clientName: string;
        clientColor?: string | null;
        subprojectCount: number;
        subprojectsPreview: { id: number; name: string; status: ProjectStatus }[];
    })[];
    completedProjects: (Project & { clientName: string })[];
    allProjects: Project[];
    alerts: {
        expiredTools: number;
        expiringTools: number;
        expiredPermissions: number;
        expiringPermissions: number;
        total: number;
    };
}

interface DashboardClientProps {
    stats: DashboardStats;
}

type SortOption = 'client' | 'dateAdded' | 'endDate' | 'price';

export default function DashboardClient({ stats }: DashboardClientProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
    const [textScale, setTextScale] = useState<'s' | 'm' | 'l'>('s');

    const getScaledClass = (baseSize: string) => {
        if (textScale === 's') return baseSize;

        const sizeMap: Record<string, Record<'m' | 'l', string>> = {
            'text-[10px]': { 'm': 'text-[12px]', 'l': 'text-[14px]' },
            'text-[9px]': { 'm': 'text-[11px]', 'l': 'text-[13px]' },
            'text-[8px]': { 'm': 'text-[10px]', 'l': 'text-[12px]' },
            'text-xl': { 'm': 'text-2xl', 'l': 'text-3xl' },
            'text-xs': { 'm': 'text-sm', 'l': 'text-base' },
            'h-4': { 'm': 'h-5', 'l': 'h-6' },
            'w-4': { 'm': 'w-5', 'l': 'w-6' },
            'h-3': { 'm': 'h-4', 'l': 'h-5' },
            'w-3': { 'm': 'w-4', 'l': 'w-5' },
            'p-1': { 'm': 'p-1.5', 'l': 'p-2' },
            'p-1.5': { 'm': 'p-2', 'l': 'p-2.5' },
            'gap-1': { 'm': 'gap-1.5', 'l': 'gap-2' },
        };

        return sizeMap[baseSize] ? sizeMap[baseSize][textScale] : baseSize;
    };

    const sortedProjects = useMemo(() => {
        const projects = [...(stats.recentProjects || [])];

        switch (sortBy) {
            case 'client':
                return projects.sort((a, b) => a.clientName.localeCompare(b.clientName));
            case 'dateAdded':
                return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            case 'endDate':
                return projects.sort((a, b) => {
                    if (!a.endDate && !b.endDate) return 0;
                    if (!a.endDate) return 1;
                    if (!b.endDate) return -1;
                    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
                });
            case 'price':
                return projects.sort((a, b) => b.totalValue - a.totalValue);
            default:
                return projects;
        }
    }, [stats.recentProjects, sortBy]);

    return (
        <div className="h-full flex flex-col overflow-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-4 flex-shrink-0">
                    <TabsList className="grid flex-1 grid-cols-3 h-9">
                        <TabsTrigger value="overview" className="text-xs font-semibold">Przegląd</TabsTrigger>
                        <TabsTrigger value="timeline" className="text-xs font-semibold">Harmonogram</TabsTrigger>
                        <TabsTrigger value="map" className="text-xs font-semibold">Mapa</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                        <Type className="h-3 w-3 text-muted-foreground ml-1 mr-2" />
                        {(['s', 'm', 'l'] as const).map((size) => (
                            <button
                                key={size}
                                onClick={() => setTextScale(size)}
                                className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                                    textScale === size
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {size.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <TabsContent value="overview" className="flex-1 flex flex-col overflow-auto mt-2 gap-2">
                    {/* Alerts Row */}
                    {stats.alerts && stats.alerts.total > 0 && (
                        <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(stats.alerts.expiredTools > 0 || stats.alerts.expiringTools > 0) && (
                                <Link href="/management?tab=tools">
                                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 group hover:border-amber-400 transition-colors">
                                        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                                            <Hammer className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Przeglądy Narzędzi</p>
                                            <div className="flex gap-3 mt-0.5">
                                                {stats.alerts.expiredTools > 0 && (
                                                    <span className="text-[10px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> {stats.alerts.expiredTools} po terminie
                                                    </span>
                                                )}
                                                {stats.alerts.expiringTools > 0 && (
                                                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {stats.alerts.expiringTools} wygasających
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )}
                            {(stats.alerts.expiredPermissions > 0 || stats.alerts.expiringPermissions > 0) && (
                                <Link href="/management?tab=employees">
                                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 group hover:border-rose-400 transition-colors">
                                        <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-rose-900 dark:text-rose-100 uppercase tracking-wider">Uprawnienia Pracowników</p>
                                            <div className="flex gap-3 mt-0.5">
                                                {stats.alerts.expiredPermissions > 0 && (
                                                    <span className="text-[10px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> {stats.alerts.expiredPermissions} wygasło
                                                    </span>
                                                )}
                                                {stats.alerts.expiringPermissions > 0 && (
                                                    <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {stats.alerts.expiringPermissions} do odnowienia
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Stats Row */}
                    <div className="grid gap-2 grid-cols-3 flex-shrink-0">
                        <Card className={cn("border", getScaledClass('p-2'))}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={cn(getScaledClass('text-[10px]'), "font-medium text-muted-foreground")}>Aktywne Projekty</p>
                                    <p className={cn(getScaledClass('text-xl'), "font-extrabold")}>{stats.activeProjects}</p>
                                </div>
                                <Briefcase className={cn(getScaledClass('h-4'), getScaledClass('w-4'), "text-primary")} />
                            </div>
                        </Card>
                        <Card className={cn("border", getScaledClass('p-2'))}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={cn(getScaledClass('text-[10px]'), "font-medium text-muted-foreground")}>Zadania</p>
                                    <p className={cn(getScaledClass('text-xl'), "font-extrabold text-green-700")}>{stats.pendingTasks.length}</p>
                                </div>
                                <CheckSquare className={cn(getScaledClass('h-4'), getScaledClass('w-4'), "text-green-700")} />
                            </div>
                        </Card>
                        <Card className={cn("border", getScaledClass('p-2'))}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={cn(getScaledClass('text-[10px]'), "font-medium text-muted-foreground")}>Zamówienia</p>
                                    <p className={cn(getScaledClass('text-xl'), "font-extrabold text-blue-700")}>{stats.pendingOrders.length}</p>
                                </div>
                                <ShoppingCart className={cn(getScaledClass('h-4'), getScaledClass('w-4'), "text-blue-700")} />
                            </div>
                        </Card>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid gap-2 grid-cols-3 flex-1 min-h-0">
                        {/* Projects Column */}
                        <Card className="border flex flex-col overflow-hidden">
                            <CardHeader className="py-1 px-2 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <CardTitle className={cn(getScaledClass('text-xs'), "font-bold")}>Projekty</CardTitle>
                                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                                        <SelectTrigger className={cn("h-6 w-[100px]", getScaledClass('text-[10px]'))}>
                                            <ArrowUpDown className={cn(getScaledClass('h-3'), getScaledClass('w-3'), "mr-1")} />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dateAdded" className={getScaledClass('text-xs')}>Data dodania</SelectItem>
                                            <SelectItem value="client" className={getScaledClass('text-xs')}>Klient</SelectItem>
                                            <SelectItem value="endDate" className={getScaledClass('text-xs')}>Data końca</SelectItem>
                                            <SelectItem value="price" className={getScaledClass('text-xs')}>Cena</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className={cn("flex-1 overflow-auto", getScaledClass('p-1'))}>
                                <div className={getScaledClass('space-y-1')}>
                                    {sortedProjects?.map((project) => (
                                        <Link href={`/projects/${project.id}`} key={project.id}>
                                            <div className={cn(
                                                "flex items-center rounded cursor-pointer hover:bg-muted/80 border transition-colors",
                                                getScaledClass('gap-1'),
                                                getScaledClass('p-1.5'),
                                                getScaledClass('text-[10px]'),
                                                project.status === 'Active' && "bg-background border-l-4",
                                                project.status === 'Completed' && "bg-red-100/60 dark:bg-red-900/30 border-l-4 border-l-red-500",
                                                project.status === 'On Hold' && "bg-orange-100/60 dark:bg-orange-900/30 border-l-4 border-l-orange-500",
                                                project.status === 'To Quote' && "bg-blue-100/60 dark:bg-blue-900/30 border-l-4 border-l-blue-500",
                                                // Default border color if active (will be overridden by style if client color exists)
                                                project.status === 'Active' && !project.clientColor && "border-l-green-500",
                                                !['Active', 'Completed', 'On Hold', 'To Quote'].includes(project.status) && "border-gray-300 dark:border-gray-600"
                                            )}

                                                style={project.clientColor ? { borderLeftColor: project.clientColor } : undefined}
                                            >
                                                {/* Client Color Marker */}
                                                {project.clientColor && (
                                                    <div
                                                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm"
                                                        style={{ backgroundColor: project.clientColor }}
                                                        title={`Klient: ${project.clientName}`}
                                                    />
                                                )}
                                                {/* Fallback to project's colorMarker if no client color */}
                                                {!project.clientColor && project.colorMarker && (
                                                    <div
                                                        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm"
                                                        style={{ backgroundColor: project.colorMarker }}
                                                    />
                                                )}
                                                {/* Client Name Badge - THIS IS THE REQUESTED CHANGE */}
                                                <div className="truncate flex-1">
                                                    <p className="font-medium truncate">{project.name}</p>
                                                    <div className="flex items-center mt-0.5">
                                                        <span
                                                            className={cn(
                                                                getScaledClass('text-[10px]'),
                                                                "px-1.5 py-0.5 rounded-full truncate max-w-full",
                                                                !project.clientColor && "text-muted-foreground"
                                                            )}
                                                            style={project.clientColor ? {
                                                                backgroundColor: project.clientColor,
                                                                color: '#fff', // Always white text on colored background for contrast
                                                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                                                fontWeight: 500
                                                            } : undefined}
                                                        >
                                                            {project.clientName}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge className={cn(
                                                    getScaledClass('text-[8px]'),
                                                    "h-4 px-1 ml-1",
                                                    project.status === 'Active' && "bg-green-600",
                                                    project.status === 'Completed' && "bg-red-600",
                                                    project.status === 'On Hold' && "bg-orange-600",
                                                    project.status === 'To Quote' && "bg-blue-600"
                                                )}>
                                                    {project.status === 'Active' ? 'Akt' :
                                                        project.status === 'Completed' ? 'Zak' :
                                                            project.status === 'On Hold' ? 'Wstrz' :
                                                                project.status === 'To Quote' ? 'Wyc' : String(project.status).slice(0, 4)}
                                                </Badge>
                                            </div>
                                        </Link>
                                    ))}
                                    {(!stats.recentProjects || stats.recentProjects.length === 0) && (
                                        <p className={cn(getScaledClass('text-[10px]'), "text-muted-foreground text-center py-2")}>Brak projektów</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tasks Column */}
                        <Card className="border flex flex-col overflow-hidden">
                            <CardHeader className="py-1 px-2 flex-shrink-0">
                                <CardTitle className={cn(getScaledClass('text-xs'), "font-bold")}>Zadania</CardTitle>
                            </CardHeader>
                            <CardContent className={cn("flex-1 overflow-auto", getScaledClass('p-1'))}>
                                <div className={getScaledClass('space-y-1')}>
                                    {stats.pendingTasks.map((task) => (
                                        <Link href={`/projects/${task.projectId}?tab=tasks`} key={task.id}>
                                            <div className={cn(
                                                "flex items-center rounded cursor-pointer border transition-colors",
                                                getScaledClass('gap-1'),
                                                getScaledClass('p-1'),
                                                getScaledClass('text-[10px]'),
                                                task.status === 'Done'
                                                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    : "bg-green-100/40 dark:bg-green-900/20 hover:bg-green-200/50 border-transparent hover:border-green-200"
                                            )}>
                                                <div className="flex flex-col items-center justify-center min-w-[16px]">
                                                    <CheckSquare className={cn(
                                                        getScaledClass('h-3'),
                                                        getScaledClass('w-3'),
                                                        "flex-shrink-0",
                                                        task.status === 'Done' ? "text-muted-foreground" : "text-green-700"
                                                    )} />
                                                </div>
                                                <div className="truncate flex-1">
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className={cn(
                                                            getScaledClass('text-[8px]'),
                                                            "h-3.5 px-1 py-0 leading-none border-0",
                                                            task.status === 'Todo' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                                                            task.status === 'In Progress' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                                                            task.status === 'Done' && "bg-gray-100 text-gray-800"
                                                        )}>
                                                            {task.status === 'Todo' ? 'Do zrobienia' :
                                                                task.status === 'In Progress' ? 'W trakcie' : 'Zrobione'}
                                                        </Badge>
                                                        <p className={cn("font-medium truncate", task.status === 'Done' && "line-through")}>{task.title}</p>
                                                    </div>
                                                    <p className={cn("text-muted-foreground truncate", getScaledClass('text-[9px]'))}>{task.projectName}</p>
                                                </div>
                                                {task.dueDate && (
                                                    <span className={cn(getScaledClass('text-[8px]'), "text-muted-foreground whitespace-nowrap ml-1")}>
                                                        {format(new Date(task.dueDate), 'dd.MM', { locale: pl })}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                    {stats.pendingTasks.length === 0 && (
                                        <p className={cn(getScaledClass('text-[10px]'), "text-muted-foreground text-center py-2")}>Brak zadań</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Orders Column */}
                        <Card className="border flex flex-col overflow-hidden">
                            <CardHeader className="py-1 px-2 flex-shrink-0">
                                <CardTitle className={cn(getScaledClass('text-xs'), "font-bold")}>Zamówienia</CardTitle>
                            </CardHeader>
                            <CardContent className={cn("flex-1 overflow-auto", getScaledClass('p-1'))}>
                                <div className={getScaledClass('space-y-1')}>
                                    {stats.pendingOrders.map((order) => (
                                        <Link href={`/projects/${order.projectId}?tab=orders`} key={order.id}>
                                            <div className={cn(
                                                "rounded cursor-pointer hover:opacity-80 transition-opacity",
                                                getScaledClass('p-1'),
                                                getScaledClass('text-[10px]'),
                                                order.status === 'Pending' && "bg-yellow-100/40 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100",
                                                order.status === 'Ordered' && "bg-blue-100/40 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
                                            )}>
                                                <div className="flex items-center justify-between">
                                                    <div className="truncate flex-1">
                                                        <div className="flex items-center gap-1">
                                                            {order.status === 'Ordered' && <span className={cn(getScaledClass('text-[8px]'), "font-bold uppercase tracking-tighter text-blue-600 bg-blue-200 px-0.5 rounded")}>Zam</span>}
                                                            <p className="font-medium truncate">{order.title}</p>
                                                        </div>
                                                        <p className="text-muted-foreground truncate">{order.supplierName}</p>
                                                    </div>
                                                    <span className={cn(
                                                        "font-bold ml-1",
                                                        order.status === 'Pending' ? "text-yellow-800 dark:text-yellow-300" : "text-blue-800 dark:text-blue-300"
                                                    )}>
                                                        {order.amount.toFixed(0)} zł
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {stats.pendingOrders.length === 0 && (
                                        <p className={cn(getScaledClass('text-[10px]'), "text-muted-foreground text-center py-2")}>Brak zamówień</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="timeline" className="flex-1 overflow-hidden mt-2">
                    <div className="h-full overflow-auto">
                        <ProjectTimeline projects={stats.allProjects} />
                    </div>
                </TabsContent>

                <TabsContent value="map" className="flex-1 overflow-hidden mt-2">
                    <div className="h-full">
                        <ProjectMap projects={stats.allProjects} />
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    );
}
