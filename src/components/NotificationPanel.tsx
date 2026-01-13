'use client';

import { useState, useEffect } from 'react';
import { Notification } from '@/types';
import { Bell, CheckCheck, Package, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    getRelatedTask,
    getRelatedOrder
} from '@/actions/notifications';

interface NotificationPanelProps {
    onClose: () => void;
    onCountChange?: (count: number) => void;
}

export function NotificationPanel({ onClose, onCountChange }: NotificationPanelProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            const data = await getNotifications();
            setNotifications(data);
            setIsLoading(false);
        };
        fetchNotifications();
    }, []);

    const updateUnreadCount = () => {
        const unread = notifications.filter(n => !n.read).length;
        onCountChange?.(unread);
    };

    const markAsRead = async (id: number) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        updateUnreadCount();
    };

    const markAllAsRead = async () => {
        await markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        onCountChange?.(0);
    };

    const clearAll = async () => {
        if (confirm('Czy na pewno chcesz usunąć wszystkie powiadomienia?')) {
            await clearAllNotifications();
            setNotifications([]);
            onCountChange?.(0);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        await markAsRead(notification.id!);

        // Navigate based on related type
        if (notification.relatedType === 'task' && notification.relatedId) {
            const task = await getRelatedTask(notification.relatedId);
            if (task) {
                router.push(`/projects/${task.projectId}?tab=tasks`);
            }
        } else if (notification.relatedType === 'order' && notification.relatedId) {
            const order = await getRelatedOrder(notification.relatedId);
            if (order) {
                router.push(`/projects/${order.projectId}?tab=orders`);
            }
        } else if (notification.relatedType === 'project' && notification.relatedId) {
            router.push(`/projects/${notification.relatedId}`);
        }

        onClose();
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'task_deadline':
                return <Calendar className="h-4 w-4 text-orange-500" />;
            case 'task_update':
            case 'task_created':
                return <CheckCheck className="h-4 w-4 text-blue-500" />;
            case 'order_status':
                return <Package className="h-4 w-4 text-green-500" />;
            default:
                return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    // Group by date
    const groupedNotifications = notifications.reduce((groups, notification) => {
        const now = new Date();
        const notifDate = new Date(notification.createdAt);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let group = 'Wcześniej';
        if (notifDate >= today) {
            group = 'Dzisiaj';
        } else if (notifDate >= yesterday) {
            group = 'Wczoraj';
        }

        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(notification);
        return groups;
    }, {} as Record<string, Notification[]>);

    const groupOrder = ['Dzisiaj', 'Wczoraj', 'Wcześniej'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Ładowanie...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-h-[600px]">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg">Powiadomienia</h3>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Oznacz jako przeczytane
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAll}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Wyczyść
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                {notifications.length > 0 ? (
                    <div className="divide-y">
                        {groupOrder.map(groupName => {
                            const group = groupedNotifications[groupName];
                            if (!group || group.length === 0) return null;

                            return (
                                <div key={groupName}>
                                    <div className="px-4 py-2 bg-muted/50 sticky top-0 z-10">
                                        <p className="text-xs font-medium text-muted-foreground">{groupName}</p>
                                    </div>
                                    {group.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 cursor-pointer transition-colors border-b last:border-0 ${notification.read
                                                ? 'hover:bg-muted/50'
                                                : 'bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium leading-tight">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                                            addSuffix: true,
                                                            locale: pl
                                                        })}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <div className="flex-shrink-0">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm text-muted-foreground">Brak powiadomień</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
