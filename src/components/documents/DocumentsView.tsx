'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Folder, CheckSquare, File, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DocsProject {
    id: number;
    name: string;
    description?: string;
    status: string;
}

interface DocsTask {
    id: number;
    projectId: number;
    title: string;
    description?: string;
    status: string;
}

interface DocsFile {
    id: number;
    name: string;
    type: string;
    size: string;
    date: string;
}

interface DocumentsViewProps {
    initialProjects: DocsProject[];
    initialTasks: DocsTask[];
    initialFiles: DocsFile[];
}

export function DocumentsView({ initialProjects, initialTasks, initialFiles }: DocumentsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [files, setFiles] = useState<DocsFile[]>(initialFiles);
    const [fileToDelete, setFileToDelete] = useState<DocsFile | null>(null);

    const projects = initialProjects;
    const tasks = initialTasks;

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDeleteFile = () => {
        if (!fileToDelete) return;

        setFiles(files.filter(f => f.id !== fileToDelete.id));
        setFileToDelete(null);
        toast.success('Dokument został usunięty');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Centrum Dokumentacji</h1>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Szukaj dokumentów, projektów, zadań..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList>
                    <TabsTrigger value="all">Wszystkie</TabsTrigger>
                    <TabsTrigger value="projects">Projekty ({filteredProjects.length})</TabsTrigger>
                    <TabsTrigger value="tasks">Zadania ({filteredTasks.length})</TabsTrigger>
                    <TabsTrigger value="files">Pliki ({filteredFiles.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4 mt-6">
                    {/* Summary of all results */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.slice(0, 5).map(project => (
                            <Link href={`/projects/${project.id}`} key={project.id}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium truncate pr-2">{project.name}</CardTitle>
                                        <Folder className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground truncate">{project.description || 'Brak opisu'}</div>
                                        <Badge variant="outline" className="mt-2">{project.status}</Badge>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {filteredTasks.slice(0, 5).map(task => (
                            <Link href={`/projects/${task.projectId}?tab=tasks`} key={task.id}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium truncate pr-2">{task.title}</CardTitle>
                                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground truncate">{task.description || 'Brak opisu'}</div>
                                        <Badge variant="secondary" className="mt-2">{task.status}</Badge>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                        {filteredFiles.slice(0, 5).map(file => (
                            <Card key={file.id} className="h-full relative group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium truncate pr-2">{file.name}</CardTitle>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground">{file.type} • {file.size}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{file.date}</div>
                                </CardContent>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setFileToDelete(file);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="projects" className="mt-6">
                    <div className="space-y-2">
                        {filteredProjects.map(project => (
                            <Link href={`/projects/${project.id}`} key={project.id}>
                                <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Folder className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium">{project.name}</p>
                                            <p className="text-xs text-muted-foreground">{project.description}</p>
                                        </div>
                                    </div>
                                    <Badge>{project.status}</Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-6">
                    <div className="space-y-2">
                        {filteredTasks.map(task => (
                            <Link href={`/projects/${task.projectId}?tab=tasks`} key={task.id}>
                                <div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <CheckSquare className="h-5 w-5 text-green-500" />
                                        <div>
                                            <p className="font-medium">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">{task.description}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">{task.status}</Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="files" className="mt-6">
                    <div className="space-y-2">
                        {filteredFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <File className="h-5 w-5 text-orange-500" />
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{file.type} • {file.size}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-muted-foreground">{file.date}</div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setFileToDelete(file)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Czy na pewno chcesz usunąć ten dokument?</DialogTitle>
                        <DialogDescription>
                            Ta operacja jest nieodwracalna. Dokument {fileToDelete?.name} zostanie trwale usunięty.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFileToDelete(null)}>
                            Anuluj
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteFile}>
                            Usuń
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
