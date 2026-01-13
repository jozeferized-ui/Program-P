'use client';

import React, { useMemo } from 'react';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Task {
    id: number;
    name: string;
    startDate?: Date | null;
    dueDate?: Date | null;
    status: string;
}

interface Project {
    id: number;
    name: string;
    startDate?: Date | null;
    endDate?: Date | null;
    status: string;
    colorMarker?: string | null;
}

interface GanttChartProps {
    projects?: Project[];
    tasks?: Task[];
    viewMode?: 'month' | 'quarter';
}

export function GanttChart({ projects = [], tasks = [], viewMode = 'month' }: GanttChartProps) {
    // Calculate date range
    const dateRange = useMemo(() => {
        const allDates: Date[] = [];

        projects.forEach(p => {
            if (p.startDate) allDates.push(new Date(p.startDate));
            if (p.endDate) allDates.push(new Date(p.endDate));
        });

        tasks.forEach(t => {
            if (t.startDate) allDates.push(new Date(t.startDate));
            if (t.dueDate) allDates.push(new Date(t.dueDate));
        });

        if (allDates.length === 0) {
            return { start: new Date(), end: addDays(new Date(), 30) };
        }

        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

        return {
            start: startOfMonth(minDate),
            end: endOfMonth(maxDate),
        };
    }, [projects, tasks]);

    const days = useMemo(() => {
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    }, [dateRange]);

    const totalDays = days.length;

    const getBarPosition = (start: Date | null | undefined, end: Date | null | undefined) => {
        if (!start || !end) return { left: 0, width: 0 };

        const startDate = new Date(start);
        const endDate = new Date(end);

        const startOffset = differenceInDays(startDate, dateRange.start);
        const duration = differenceInDays(endDate, startDate) + 1;

        return {
            left: Math.max(0, (startOffset / totalDays) * 100),
            width: Math.min(100 - (startOffset / totalDays) * 100, (duration / totalDays) * 100),
        };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
            case 'In Progress':
                return 'bg-blue-500';
            case 'Completed':
            case 'Done':
                return 'bg-green-500';
            case 'On Hold':
                return 'bg-yellow-500';
            case 'To Quote':
            case 'To Do':
                return 'bg-gray-400';
            default:
                return 'bg-gray-500';
        }
    };

    const items = [
        ...projects.map(p => ({
            id: `project-${p.id}`,
            name: p.name,
            start: p.startDate,
            end: p.endDate,
            status: p.status,
            color: p.colorMarker || undefined,
            type: 'project' as const,
        })),
        ...tasks.map(t => ({
            id: `task-${t.id}`,
            name: t.name,
            start: t.startDate,
            end: t.dueDate,
            status: t.status,
            color: undefined,
            type: 'task' as const,
        })),
    ];

    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Brak danych do wyświetlenia. Dodaj projekty lub zadania z datami.
            </div>
        );
    }

    // Group days by month for header
    const months = useMemo(() => {
        const result: { month: string; days: number }[] = [];
        let currentMonth = '';
        let currentCount = 0;

        days.forEach((day, i) => {
            const monthName = format(day, 'MMM yyyy', { locale: pl });
            if (monthName !== currentMonth) {
                if (currentMonth) {
                    result.push({ month: currentMonth, days: currentCount });
                }
                currentMonth = monthName;
                currentCount = 1;
            } else {
                currentCount++;
            }
        });
        if (currentMonth) {
            result.push({ month: currentMonth, days: currentCount });
        }

        return result;
    }, [days]);

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[800px]">
                {/* Header - Months */}
                <div className="flex border-b">
                    <div className="w-48 flex-shrink-0 p-2 font-medium bg-muted/50">Nazwa</div>
                    <div className="flex-1 flex">
                        {months.map((m, i) => (
                            <div
                                key={i}
                                className="text-center text-xs font-medium py-2 border-l"
                                style={{ width: `${(m.days / totalDays) * 100}%` }}
                            >
                                {m.month}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows */}
                {items.map((item) => {
                    const position = getBarPosition(item.start, item.end);

                    return (
                        <div key={item.id} className="flex border-b hover:bg-muted/30">
                            <div className="w-48 flex-shrink-0 p-2 text-sm truncate flex items-center gap-2">
                                {item.type === 'project' && (
                                    <span className="text-xs bg-primary/20 text-primary px-1 rounded">P</span>
                                )}
                                {item.name}
                            </div>
                            <div className="flex-1 relative h-10">
                                {position.width > 0 && (
                                    <div
                                        className={cn(
                                            "absolute top-2 h-6 rounded-full text-xs text-white flex items-center px-2 truncate shadow-sm",
                                            item.color || getStatusColor(item.status)
                                        )}
                                        style={{
                                            left: `${position.left}%`,
                                            width: `${Math.max(position.width, 3)}%`,
                                            backgroundColor: item.color || undefined,
                                        }}
                                        title={`${item.name}: ${item.start ? format(new Date(item.start), 'dd MMM', { locale: pl }) : '?'} - ${item.end ? format(new Date(item.end), 'dd MMM', { locale: pl }) : '?'}`}
                                    >
                                        {position.width > 10 && item.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
