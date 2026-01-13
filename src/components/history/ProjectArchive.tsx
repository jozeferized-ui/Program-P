'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { getCompletedProjects } from '@/actions/trash';

interface Project {
    id: number;
    name: string;
    endDate?: Date;
    totalValue: number;
}

export function ProjectArchive() {
    const [completedProjects, setCompletedProjects] = useState<Project[]>([]);

    useEffect(() => {
        const fetchProjects = async () => {
            const projects = await getCompletedProjects();
            setCompletedProjects(projects as Project[]);
        };
        fetchProjects();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Archiwum projektów</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nazwa</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data zakończenia</TableHead>
                            <TableHead className="text-right">Wartość</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {completedProjects?.map((project) => (
                            <TableRow key={project.id}>
                                <TableCell className="font-medium">{project.name}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">Zakończony</Badge>
                                </TableCell>
                                <TableCell>
                                    {project.endDate ? format(new Date(project.endDate), 'dd.MM.yyyy', { locale: pl }) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {project.totalValue.toFixed(2)} zł
                                </TableCell>
                            </TableRow>
                        ))}
                        {completedProjects?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Brak zakończonych projektów
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
