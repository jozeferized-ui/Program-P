'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { getCompletedTasks } from '@/actions/trash';

interface Task {
    id: number;
    title: string;
    priority: string;
    dueDate?: Date;
}

export function TaskArchive() {
    const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

    useEffect(() => {
        const fetchTasks = async () => {
            const tasks = await getCompletedTasks();
            setCompletedTasks(tasks as Task[]);
        };
        fetchTasks();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Archiwum zadań</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tytuł</TableHead>
                            <TableHead>Priorytet</TableHead>
                            <TableHead>Data wykonania</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {completedTasks?.map((task) => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium">{task.title}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        task.priority === 'High' ? 'destructive' :
                                            task.priority === 'Medium' ? 'default' : 'secondary'
                                    }>
                                        {task.priority === 'High' ? 'Wysoki' :
                                            task.priority === 'Medium' ? 'Średni' : 'Niski'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {task.dueDate ? format(new Date(task.dueDate), 'dd.MM.yyyy', { locale: pl }) : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {completedTasks?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    Brak zakończonych zadań
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
