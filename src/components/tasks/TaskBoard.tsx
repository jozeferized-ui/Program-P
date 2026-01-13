'use client';


import { Task, TaskStatus, Order, ExtendedProject, OrderTemplate } from '@/types';
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog';
import { TaskDetailsDialog } from '@/components/tasks/TaskDetailsDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ShoppingCart, Link as LinkIcon, FileText } from 'lucide-react';
import { updateTask } from '@/actions/tasks';
import { updateOrder } from '@/actions/orders';
import { toast } from 'sonner';

interface TaskBoardProps {
    projectId: number;
    initialTasks: Task[];
    initialOrders: Order[];
    project: ExtendedProject;
    orderTemplates: OrderTemplate[];
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'Todo', title: 'Do Zrobienia' },
    { id: 'In Progress', title: 'W Trakcie' },
    { id: 'Done', title: 'Zakończone' },
];

type BoardItem =
    | { type: 'task'; data: Task; id: string }
    | { type: 'order'; data: Order; id: string };

export function TaskBoard({ projectId, initialTasks, initialOrders, project, orderTemplates }: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [orders, setOrders] = useState<Order[]>(initialOrders);

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const itemsByStatus = useMemo(() => {
        const acc: Record<TaskStatus, BoardItem[]> = {
            'Todo': [],
            'In Progress': [],
            'Done': []
        };

        tasks.forEach((task) => {
            if (acc[task.status]) {
                acc[task.status].push({ type: 'task', data: task, id: `task-${task.id}` });
            }
        });

        orders?.forEach((order) => {
            let status: TaskStatus = 'Todo';
            if (order.status === 'Ordered') status = 'In Progress';
            if (order.status === 'Delivered') status = 'Done';

            acc[status].push({ type: 'order', data: order, id: `order-${order.id}` });
        });

        return acc;
    }, [tasks, orders]);

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        setActiveId(active.id as string);
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        // Determine item type and ID
        const isTask = activeIdStr.startsWith('task-');
        const itemId = parseInt(activeIdStr.split('-')[1]);

        // Find target column
        let newStatus: TaskStatus | undefined;

        if (COLUMNS.some(col => col.id === overIdStr)) {
            newStatus = overIdStr as TaskStatus;
        } else {
            // Dropped over another item, find that item's status
            const overItem = Object.values(itemsByStatus).flat().find(i => i.id === overIdStr);
            if (overItem) {
                if (overItem.type === 'task') newStatus = overItem.data.status;
                else {
                    if (overItem.data.status === 'Pending') newStatus = 'Todo';
                    else if (overItem.data.status === 'Ordered') newStatus = 'In Progress';
                    else newStatus = 'Done';
                }
            }
        }

        if (!newStatus) return;

        if (isTask) {
            const task = tasks.find(t => t.id === itemId);
            if (task && task.status !== newStatus) {
                // Optimistic update
                setTasks(prev => prev.map(t => t.id === itemId ? { ...t, status: newStatus! } : t));
                try {
                    await updateTask(itemId, { status: newStatus });
                } catch (error) {
                    toast.error("Błąd aktualizacji zadania.");
                    // Revert optimistic update
                    setTasks(prev => prev.map(t => t.id === itemId ? { ...t, status: task.status } : t));
                }
            }
        } else {
            const order = orders?.find(o => o.id === itemId);
            let orderStatus: 'Pending' | 'Ordered' | 'Delivered' = 'Pending';
            if (newStatus === 'In Progress') orderStatus = 'Ordered';
            if (newStatus === 'Done') orderStatus = 'Delivered';

            if (order && order.status !== orderStatus) {
                // Optimistic update
                setOrders(prev => prev.map(o => o.id === itemId ? { ...o, status: orderStatus } : o));
                try {
                    await updateOrder(itemId, { status: orderStatus });
                } catch (error) {
                    toast.error("Błąd aktualizacji zamówienia.");
                    // Revert optimistic update
                    setOrders(prev => prev.map(o => o.id === itemId ? { ...o, status: order.status } : o));
                }
            }
        }
    }

    const activeItem = activeId ? Object.values(itemsByStatus).flat().find(i => i.id === activeId) : null;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <AddTaskDialog projectId={projectId} orderTemplates={orderTemplates} />
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
                    {COLUMNS.map((col) => (
                        <Column
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            items={itemsByStatus[col.id]}
                            project={project}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeItem ? (
                        activeItem.type === 'task' ?
                            <TaskCard task={activeItem.data} /> :
                            <OrderCard order={activeItem.data} />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

function Column({ id, title, items, project }: { id: string, title: string, items: BoardItem[], project: ExtendedProject }) {
    const { setNodeRef } = useSortable({ id });

    return (
        <div ref={setNodeRef} className="flex flex-col bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 gap-4">
            <h3 className="font-semibold text-lg flex items-center justify-between">
                {title}
                <Badge variant="secondary">{items.length}</Badge>
            </h3>
            <div className="flex flex-col gap-3 min-h-[200px]">
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item) => (
                        <SortableItem key={item.id} item={item} project={project} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

function SortableItem({ item, project }: { item: BoardItem, project: ExtendedProject }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {item.type === 'task' ? (
                <TaskDetailsDialog task={item.data} project={project}>
                    <div className="cursor-pointer">
                        <TaskCard task={item.data} />
                    </div>
                </TaskDetailsDialog>
            ) : (
                <div className="cursor-grab">
                    <OrderCard order={item.data} />
                </div>
            )}
        </div>
    );
}

function TaskCard({ task }: { task: Task }) {
    // Use checklist instead of subtasks
    const completedSubtasks = task.checklist?.filter(st => st.completed).length || 0;
    const totalSubtasks = task.checklist?.length || 0;

    return (
        <Card className="hover:shadow-md transition-shadow bg-white dark:bg-card">
            <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <span className="font-medium leading-none">{task.title}</span>
                    <Badge
                        variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 h-5"
                    >
                        {task.priority === 'Low' ? 'Niski' : task.priority === 'Medium' ? 'Średni' : 'Wysoki'}
                    </Badge>
                </div>
                {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                    {task.dueDate && (
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(task.dueDate), 'd MMM', { locale: pl })}
                        </p>
                    )}
                    {totalSubtasks > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                            {completedSubtasks}/{totalSubtasks}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function OrderCard({ order }: { order: Order }) {
    return (
        <Card className="hover:shadow-md transition-shadow border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10">
            <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium leading-none text-sm">{order.title}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                        {order.amount.toFixed(2)} zł <span className="font-normal text-[10px] opacity-70">brutto</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    {order.url && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-500">
                            <LinkIcon className="h-3 w-3" />
                            Link
                        </div>
                    )}
                    {order.notes && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            Notatka
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(order.date), 'd MMM', { locale: pl })}
                    </p>
                    <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 dark:text-blue-300">
                        Zamówienie
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
