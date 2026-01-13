'use client';

import { Project } from '@/types';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectTimelineProps {
    projects: Project[];
}

export default function ProjectTimeline({ projects }: ProjectTimelineProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filter projects that have start and end dates
    const timelineProjects = projects.filter(p => p.startDate && p.endDate && p.status !== 'Completed' && p.status !== 'On Hold');

    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentDate(addDays(endDate, 1));
    const prevMonth = () => setCurrentDate(addDays(startDate, -1));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Harmonogram Projektów</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-32 text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: pl })}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="grid grid-cols-[200px_1fr] border-b bg-muted/50">
                        <div className="p-2 font-medium text-sm border-r">Projekt</div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(30px, 1fr))` }}>
                            {days.map(day => (
                                <div key={day.toString()} className={`p-1 text-xs text-center border-r last:border-r-0 ${isToday(day) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                                    {format(day, 'd')}
                                    <div className="text-[10px] text-muted-foreground">{format(day, 'EEEEE', { locale: pl })}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y">
                        {timelineProjects.map(project => {
                            const pStart = new Date(project.startDate!);
                            const pEnd = new Date(project.endDate!);

                            // Calculate position and width
                            // This is a simplified view, only showing parts within current month

                            return (
                                <div key={project.id} className="grid grid-cols-[200px_1fr] hover:bg-muted/20 transition-colors">
                                    <div className="p-2 text-sm font-medium border-r truncate" title={project.name}>
                                        {project.name}
                                    </div>
                                    <div className="relative h-10">
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(30px, 1fr))` }}>
                                            {days.map(day => (
                                                <div key={day.toString()} className={`border-r last:border-r-0 ${isToday(day) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`} />
                                            ))}
                                        </div>

                                        {/* Project Bar */}
                                        {/* We need to calculate if the project overlaps with current month */}
                                        {(pEnd >= startDate && pStart <= endDate) && (
                                            (() => {
                                                // Calculate start and end indices within the current month view
                                                let startIndex = differenceInDays(pStart, startDate);
                                                let duration = differenceInDays(pEnd, pStart) + 1;

                                                // Adjust if starts before this month
                                                if (startIndex < 0) {
                                                    duration += startIndex; // reduce duration by days before start
                                                    startIndex = 0;
                                                }

                                                // Adjust if ends after this month
                                                const daysInMonth = days.length;
                                                if (startIndex + duration > daysInMonth) {
                                                    duration = daysInMonth - startIndex;
                                                }

                                                if (duration <= 0) return null;

                                                return (
                                                    <div
                                                        className="absolute top-2 bottom-2 bg-blue-500 rounded-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                                                        style={{
                                                            left: `calc(${(startIndex / days.length) * 100}% + 2px)`,
                                                            width: `calc(${(duration / days.length) * 100}% - 4px)`
                                                        }}
                                                        title={`${project.name}: ${format(pStart, 'd MMM')} - ${format(pEnd, 'd MMM')}`}
                                                    />
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {timelineProjects.length === 0 && (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                Brak projektów z datami w tym okresie.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
