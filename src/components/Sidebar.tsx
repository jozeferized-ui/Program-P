'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, Users, Briefcase, Settings, Calendar, Truck, PieChart, PackageOpen, History, Trash2, FileText, Warehouse, ChevronLeft, ChevronRight, GripVertical, RotateCcw, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import { NotificationBell } from '@/components/NotificationBell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LucideIcon } from 'lucide-react';
import { logout } from '@/actions/auth';
import { useRouter } from 'next/navigation';

interface SidebarItem {
    id: string;
    icon: LucideIcon;
    label: string;
    href: string;
}

const defaultSidebarItems: SidebarItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { id: 'finances', icon: PieChart, label: 'Finanse', href: '/finances' },
    { id: 'clients', icon: Users, label: 'Klienci', href: '/clients' },
    { id: 'projects', icon: Briefcase, label: 'Projekty', href: '/projects' },
    { id: 'production', icon: PackageOpen, label: 'Produkcja', href: '/production' },
    { id: 'management', icon: LayoutDashboard, label: 'Zarządzanie', href: '/management' },
    { id: 'history', icon: History, label: 'Historia', href: '/history' },
    { id: 'suppliers', icon: Truck, label: 'Dostawcy', href: '/suppliers' },
    { id: 'warehouse', icon: Warehouse, label: 'Magazyn', href: '/warehouse' },
    { id: 'documents', icon: FileText, label: 'Dokumenty', href: '/documents' },
    { id: 'calendar', icon: Calendar, label: 'Kalendarz', href: '/calendar' },
    { id: 'trash', icon: Trash2, label: 'Kosz', href: '/trash' },
    { id: 'settings', icon: Settings, label: 'Ustawienia', href: '/settings' },
];

const SIDEBAR_ORDER_KEY = 'sidebar-order';

function SortableNavItem({
    item,
    isActive,
    isCollapsed,
    isEditMode
}: {
    item: SidebarItem;
    isActive: boolean;
    isCollapsed: boolean;
    isEditMode: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id, disabled: !isEditMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const linkContent = (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                isCollapsed && "justify-center px-2",
                isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isDragging && "z-50 shadow-lg"
            )}
        >
            {/* Drag handle - only in edit mode */}
            {isEditMode && !isCollapsed && (
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground -ml-1"
                >
                    <GripVertical className="h-4 w-4" />
                </div>
            )}

            {/* Active indicator - left border */}
            {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary transition-all duration-300" />
            )}

            {/* Icon with glow effect on active */}
            <item.icon className={cn(
                "h-5 w-5 shrink-0 transition-all duration-200",
                isActive && "drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]",
                !isActive && "group-hover:scale-110"
            )} />

            {/* Label */}
            {!isCollapsed && (
                <span className="flex-1 transition-all duration-200">
                    {item.label}
                </span>
            )}

            {/* Hover glow effect */}
            <span className={cn(
                "absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none",
                "group-hover:opacity-100",
                isActive ? "bg-primary/5" : "bg-accent/50"
            )} />
        </div>
    );

    // Wrap with Link only when not in edit mode
    if (!isEditMode) {
        return (
            <Link href={item.href} className="block">
                {linkContent}
            </Link>
        );
    }

    return linkContent;
}

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [items, setItems] = useState<SidebarItem[]>(defaultSidebarItems);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Load saved order from localStorage
    useEffect(() => {
        const savedOrder = localStorage.getItem(SIDEBAR_ORDER_KEY);
        if (savedOrder) {
            try {
                const orderIds: string[] = JSON.parse(savedOrder);
                const orderedItems = orderIds
                    .map(id => defaultSidebarItems.find(item => item.id === id))
                    .filter((item): item is SidebarItem => item !== undefined);

                // Add any new items that weren't in saved order
                defaultSidebarItems.forEach(item => {
                    if (!orderedItems.find(i => i.id === item.id)) {
                        orderedItems.push(item);
                    }
                });

                setItems(orderedItems);
            } catch {
                setItems(defaultSidebarItems);
            }
        }
    }, []);

    // Save order to localStorage
    const saveOrder = (newItems: SidebarItem[]) => {
        const orderIds = newItems.map(item => item.id);
        localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(orderIds));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                saveOrder(newItems);
                return newItems;
            });
        }
    };

    const resetOrder = () => {
        setItems(defaultSidebarItems);
        localStorage.removeItem(SIDEBAR_ORDER_KEY);
    };

    const activeItem = activeId ? items.find(item => item.id === activeId) : null;

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 transition-all duration-300 ease-in-out relative",
                    isCollapsed ? "w-[70px]" : "w-64"
                )}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md hover:bg-accent transition-colors"
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                    ) : (
                        <ChevronLeft className="h-3 w-3" />
                    )}
                </button>

                <div className="flex h-full max-h-screen flex-col gap-2">
                    {/* Header */}
                    <div className={cn(
                        "flex h-14 items-center border-b px-4",
                        isCollapsed ? "justify-center" : "justify-between"
                    )}>
                        <Link className="flex items-center gap-2 font-semibold" href="/">
                            <Briefcase className="h-6 w-6 shrink-0" />
                            {!isCollapsed && <span className="transition-opacity duration-200">Project Manager</span>}
                        </Link>
                        {!isCollapsed && <NotificationBell />}
                    </div>

                    {/* Edit Mode Toggle */}
                    {!isCollapsed && (
                        <div className="px-4 flex items-center justify-between">
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={cn(
                                    "text-xs px-2 py-1 rounded transition-colors",
                                    isEditMode
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                )}
                            >
                                {isEditMode ? "Gotowe" : "Edytuj kolejność"}
                            </button>
                            {isEditMode && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={resetOrder}
                                            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Przywróć domyślną kolejność</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <ScrollArea className="flex-1 px-2 py-2">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                <nav className={cn(
                                    "grid items-start text-sm font-medium gap-1",
                                    isCollapsed ? "px-1" : "px-2 lg:px-3"
                                )}>
                                    {items.map((item) => {
                                        const isActive = pathname === item.href;

                                        if (isCollapsed) {
                                            return (
                                                <Tooltip key={item.id}>
                                                    <TooltipTrigger asChild>
                                                        <Link href={item.href} className="block">
                                                            <div className={cn(
                                                                "group relative flex items-center justify-center rounded-lg px-2 py-2.5 transition-all duration-200",
                                                                isActive
                                                                    ? "bg-primary/10 text-primary font-medium"
                                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                            )}>
                                                                {isActive && (
                                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary transition-all duration-300" />
                                                                )}
                                                                <item.icon className={cn(
                                                                    "h-5 w-5 shrink-0 transition-all duration-200",
                                                                    isActive && "drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]",
                                                                    !isActive && "group-hover:scale-110"
                                                                )} />
                                                            </div>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="font-medium">
                                                        {item.label}
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        }

                                        return (
                                            <SortableNavItem
                                                key={item.id}
                                                item={item}
                                                isActive={isActive}
                                                isCollapsed={isCollapsed}
                                                isEditMode={isEditMode}
                                            />
                                        );
                                    })}
                                </nav>
                            </SortableContext>

                            <DragOverlay>
                                {activeItem ? (
                                    <div className="bg-background border rounded-lg shadow-xl px-3 py-2.5 flex items-center gap-3 text-sm font-medium">
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <activeItem.icon className="h-5 w-5" />
                                        <span>{activeItem.label}</span>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </ScrollArea>

                    {/* Footer */}
                    <div className={cn(
                        "mt-auto p-4 border-t space-y-4",
                        isCollapsed && "flex flex-col items-center p-2"
                    )}>
                        {isCollapsed ? (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <ModeToggle />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        Zmień motyw
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={async () => {
                                                await logout();
                                                window.location.href = '/login';
                                            }}
                                            className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                                        >
                                            <LogOut className="h-5 w-5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Wyloguj</TooltipContent>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground font-medium">Motyw</span>
                                    <ModeToggle />
                                </div>
                                <button
                                    onClick={async () => {
                                        await logout();
                                        window.location.href = '/login';
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Wyloguj
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

