'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { downloadICal, CalendarEvent } from '@/lib/ical';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    isToday,
    startOfDay,
    endOfDay
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CalendarTask {
    id: number;
    projectId: number;
    title: string;
    description?: string;
    status: string;
    dueDate?: Date | string;
}

interface CalendarProject {
    id: number;
    name: string;
    description?: string;
    status: string;
    startDate?: Date | string;
    endDate?: Date | string;
    quoteDueDate?: Date | string;
}

interface CalendarOrder {
    id?: number;
    projectId: number;
    title: string;
    amount: number;
    date: Date | string;
}

interface CalendarViewProps {
    initialTasks: CalendarTask[];
    initialProjects: CalendarProject[];
    initialOrders: CalendarOrder[];
}

export function CalendarView({ initialTasks, initialProjects, initialOrders }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const tasks = initialTasks;
    const projects = initialProjects;
    const orders = initialOrders;

    const firstDayOfMonth = startOfMonth(currentDate);
    const lastDayOfMonth = endOfMonth(currentDate);
    const startDate = startOfWeek(firstDayOfMonth, { locale: pl });
    const endDate = endOfWeek(lastDayOfMonth, { locale: pl });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const getEventsForDay = (day: Date) => {
        const dayTasks = tasks?.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), day)) || [];
        const dayProjects = projects?.filter(project => {
            const isActive = project.startDate && project.endDate && day >= startOfDay(new Date(project.startDate)) && day <= endOfDay(new Date(project.endDate));
            const isQuoteDeadline = project.status === 'To Quote' && project.quoteDueDate && isSameDay(new Date(project.quoteDueDate), day);
            return isActive || isQuoteDeadline;
        }) || [];
        const dayOrders = orders?.filter(order => isSameDay(new Date(order.date), day)) || [];
        return { tasks: dayTasks, projects: dayProjects, orders: dayOrders };
    };

    const handleExportCalendar = () => {
        const events: CalendarEvent[] = [];

        // Add Projects
        projects?.forEach(p => {
            if (p.startDate && p.endDate) {
                events.push({
                    title: `PROJ: ${p.name}`,
                    startDate: new Date(p.startDate),
                    endDate: new Date(p.endDate),
                    allDay: true,
                    description: p.description
                });
            }
            if (p.quoteDueDate) {
                events.push({
                    title: `WYCENA: ${p.name}`,
                    startDate: new Date(p.quoteDueDate),
                    allDay: true
                });
            }
        });

        // Add Tasks
        tasks?.forEach(t => {
            if (t.dueDate) {
                events.push({
                    title: `ZADANIE: ${t.title}`,
                    startDate: new Date(t.dueDate),
                    allDay: true,
                    description: t.description
                });
            }
        });

        // Add Orders
        orders?.forEach(o => {
            events.push({
                title: `ZAMÓWIENIE: ${o.title}`,
                startDate: new Date(o.date),
                allDay: true,
                description: `Kwota: ${o.amount} PLN`
            });
        });

        downloadICal(events, `kalendarz-${format(new Date(), 'yyyy-MM-dd')}.ics`);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Kalendarz</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-medium min-w-[150px] text-center">
                        {format(currentDate, 'LLLL yyyy', { locale: pl })}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={goToToday} className="ml-2">
                        Dzisiaj
                    </Button>
                </div>
                <Button onClick={handleExportCalendar} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Eksportuj do Kalendarza
                </Button>
            </div>

            <Card className="flex-1 flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b">
                        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((day) => (
                            <div key={day} className="p-4 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                        {calendarDays.map((day, _dayIdx) => {
                            const { tasks: dayTasks, projects: dayProjects, orders: dayOrders } = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "min-h-[120px] p-2 border-b border-r last:border-r-0 relative group transition-colors hover:bg-muted/50",
                                        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                        isToday(day) && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                >
                                    <span className={cn(
                                        "text-sm font-medium block mb-1",
                                        isToday(day) && "text-blue-600 dark:text-blue-400 font-bold"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    <div className="space-y-1">
                                        {dayProjects.map(project => {
                                            const isQuoteDeadline = project.status === 'To Quote' && project.quoteDueDate && isSameDay(new Date(project.quoteDueDate), day);
                                            const isActiveProject = project.startDate && project.endDate && day >= startOfDay(new Date(project.startDate)) && day <= endOfDay(new Date(project.endDate));

                                            if (!isActiveProject && !isQuoteDeadline) return null;

                                            return (
                                                <Link href={`/projects/${project.id}`} key={`p-${project.id}`} className="block">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-[10px] px-1 py-0 truncate border-l-2 cursor-pointer hover:bg-accent",
                                                            isQuoteDeadline ? "border-l-purple-500 bg-purple-50 dark:bg-purple-900/20" :
                                                                project.status === 'Active' ? "border-l-green-500" :
                                                                    project.status === 'Completed' ? "border-l-red-500" : "border-l-orange-500"
                                                        )}
                                                    >
                                                        {isQuoteDeadline ? `WYCENA: ${project.name}` : `PROJ: ${project.name}`}
                                                    </Badge>
                                                </Link>
                                            );
                                        })}
                                        {dayOrders.map(order => (
                                            <Link href={`/projects/${order.projectId}?tab=orders`} key={`o-${order.id}`} className="block">
                                                <Badge
                                                    variant="outline"
                                                    className="w-full justify-start text-[10px] px-1 py-0 truncate border-l-2 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 cursor-pointer hover:bg-accent"
                                                >
                                                    ZAM: {order.title}
                                                </Badge>
                                            </Link>
                                        ))}
                                        {dayTasks.map(task => (
                                            <div key={`t-${task.id}`} className="flex items-center gap-1 text-[10px] bg-secondary/50 rounded px-1 py-0.5 truncate">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    task.status === 'Done' ? "bg-green-500" :
                                                        task.status === 'In Progress' ? "bg-blue-500" : "bg-gray-400"
                                                )} />
                                                <span className={cn(task.status === 'Done' && "line-through text-muted-foreground")}>
                                                    {task.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
