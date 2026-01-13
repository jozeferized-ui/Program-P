'use client';

import { useState, useEffect } from 'react';
import { Task, Subtask, Project, ExtendedProject } from '@/types';
import { updateTask, deleteTask } from '@/actions/tasks';
import { getProject } from '@/actions/projects';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Calendar, Flag, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TaskDetailsDialogProps {
    task: Task;
    project?: ExtendedProject;
    children: React.ReactNode;
}

export function TaskDetailsDialog({ task, project: initialProject, children }: TaskDetailsDialogProps) {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [project, setProject] = useState<ExtendedProject | null>(initialProject || null);

    useEffect(() => {
        if (!project && task.projectId) {
            getProject(task.projectId).then(p => {
                if (p) setProject(p);
            });
        }
    }, [task.projectId, project]);

    const handleAddSubtask = async () => {
        if (!newSubtaskTitle.trim() || !task.id) return;

        const newSubtask: Subtask = {
            id: crypto.randomUUID(),
            title: newSubtaskTitle,
            completed: false,
        };

        const updatedSubtasks = [...(task.subtasks || []), newSubtask];
        try {
            await updateTask(task.id, { subtasks: updatedSubtasks });
            setNewSubtaskTitle('');
        } catch (error) {
            toast.error("Błąd aktualizacji zadania.");
        }
    };

    const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
        if (!task.id) return;
        const updatedSubtasks = task.subtasks?.map(st =>
            st.id === subtaskId ? { ...st, completed } : st
        );
        try {
            await updateTask(task.id, { subtasks: updatedSubtasks });
        } catch (error) {
            toast.error("Błąd aktualizacji zadania.");
        }
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        if (!task.id) return;
        const updatedSubtasks = task.subtasks?.filter(st => st.id !== subtaskId);
        try {
            await updateTask(task.id, { subtasks: updatedSubtasks });
        } catch (error) {
            toast.error("Błąd aktualizacji zadania.");
        }
    };

    const handleDeleteTask = async () => {
        if (!task.id) return;
        if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
            try {
                await deleteTask(task.id);
                toast.success("Zadanie usunięte.");
            } catch (error) {
                toast.error("Błąd usuwania zadania.");
            }
        }
    };

    const handleUpdateTitle = async () => {
        if (!editedTitle.trim() || !task.id) return;
        try {
            await updateTask(task.id, { title: editedTitle });
            setIsEditingTitle(false);
        } catch (error) {
            toast.error("Błąd aktualizacji tytułu.");
        }
    };

    const handleStartEditingTitle = () => {
        setEditedTitle(task.title);
        setIsEditingTitle(true);
    };

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim() || !task.id) return;
        const newItem = { id: crypto.randomUUID(), text: newChecklistItem, completed: false };
        const updatedChecklist = [...(task.checklist || []), newItem];
        try {
            await updateTask(task.id, { checklist: updatedChecklist });
            setNewChecklistItem('');
        } catch (error) {
            toast.error("Błąd aktualizacji listy.");
        }
    };

    const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
        if (!task.id) return;
        const updatedChecklist = task.checklist?.map(item =>
            item.id === itemId ? { ...item, completed } : item
        );
        try {
            await updateTask(task.id, { checklist: updatedChecklist });
        } catch (error) {
            toast.error("Błąd aktualizacji listy.");
        }
    };

    const handleDeleteChecklistItem = async (itemId: string) => {
        if (!task.id) return;
        const updatedChecklist = task.checklist?.filter(item => item.id !== itemId);
        try {
            await updateTask(task.id, { checklist: updatedChecklist });
        } catch (error) {
            toast.error("Błąd aktualizacji listy.");
        }
    };

    const shareOnWhatsApp = () => {
        const checklistText = task.checklist?.map(item => `${item.completed ? '☑' : '☐'} ${item.text}`).join('\n') || 'Brak elementów';
        const projectName = project?.name || 'Nieznany projekt';
        const dueDateText = task.dueDate ? `\n*Termin:* ${format(new Date(task.dueDate), 'd MMMM yyyy', { locale: pl })}` : '';

        const message = `*Projekt: ${projectName}*\n*Zadanie: ${task.title}*${dueDateText}\n${task.description ? `\n${task.description}\n` : ''}\n*Lista dla ekipy:*\n${checklistText}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-start justify-between pr-4 gap-2">
                        {isEditingTitle ? (
                            <div className="flex-1 flex gap-2">
                                <Input
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateTitle();
                                        if (e.key === 'Escape') setIsEditingTitle(false);
                                    }}
                                    className="text-xl font-semibold"
                                    autoFocus
                                />
                                <Button size="sm" onClick={handleUpdateTitle}>
                                    Zapisz
                                </Button>
                            </div>
                        ) : (
                            <DialogTitle
                                className="text-xl cursor-pointer hover:text-primary transition-colors"
                                onClick={handleStartEditingTitle}
                            >
                                {task.title}
                            </DialogTitle>
                        )}
                        <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'}>
                            {task.priority === 'Low' ? 'Niski' : task.priority === 'Medium' ? 'Średni' : 'Wysoki'}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Description & Meta */}
                    <div className="space-y-2">
                        {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <Input
                                    type="date"
                                    value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                                    onChange={async (e) => {
                                        const newDate = e.target.value ? new Date(e.target.value) : undefined;
                                        if (task.id) {
                                            try {
                                                await updateTask(task.id, { dueDate: newDate });
                                            } catch (error) {
                                                toast.error("Błąd aktualizacji daty.");
                                            }
                                        }
                                    }}
                                    className="h-6 text-xs w-32"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                {task.status}
                            </div>
                        </div>
                    </div>

                    {/* Checklist Section */}
                    <div className="space-y-3 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Lista dla ekipy</h4>
                            <Button variant="outline" size="sm" onClick={shareOnWhatsApp} className="h-7 text-xs gap-1">
                                <Share2 className="h-3 w-3" />
                                WhatsApp
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {task.checklist?.map((item) => (
                                <div key={item.id} className="flex items-center gap-2 group">
                                    <Checkbox
                                        id={item.id}
                                        checked={item.completed}
                                        onCheckedChange={(checked) => handleToggleChecklistItem(item.id, checked as boolean)}
                                    />
                                    <label
                                        htmlFor={item.id}
                                        className={`text-sm flex-1 cursor-pointer ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                                    >
                                        {item.text}
                                    </label>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteChecklistItem(item.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <Input
                                placeholder="Co zabrać / zrobić?"
                                value={newChecklistItem}
                                onChange={(e) => setNewChecklistItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                                className="h-8 text-sm"
                            />
                            <Button size="sm" onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}>
                                Dodaj
                            </Button>
                        </div>
                    </div>

                    {/* Subtasks Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Podzadania ({completedSubtasks}/{totalSubtasks})</h4>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            {task.subtasks?.map((subtask) => (
                                <div key={subtask.id} className="flex items-center gap-2 group">
                                    <Checkbox
                                        id={subtask.id}
                                        checked={subtask.completed}
                                        onCheckedChange={(checked) => handleToggleSubtask(subtask.id, checked as boolean)}
                                    />
                                    <label
                                        htmlFor={subtask.id}
                                        className={`text-sm flex-1 cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                                    >
                                        {subtask.title}
                                    </label>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteSubtask(subtask.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Add New */}
                        <div className="flex items-center gap-2 pt-2">
                            <Input
                                placeholder="Dodaj podzadanie..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                className="h-8 text-sm"
                            />
                            <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="destructive" size="sm" onClick={handleDeleteTask}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Usuń zadanie
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
