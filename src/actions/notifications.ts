'use server'

import { prisma } from '@/lib/prisma'
import { Notification, NotificationType } from '@/types'
import { revalidatePath } from 'next/cache'

export async function createNotification(
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: number,
    relatedType?: 'task' | 'order' | 'project'
): Promise<Notification> {
    try {
        const notification = await prisma.notification.create({
            data: {
                type,
                title,
                message,
                relatedId,
                relatedType,
                read: false,
                createdAt: new Date()
            }
        });
        revalidatePath('/'); // Notifications are global
        return {
            ...notification,
            type: notification.type as NotificationType,
            relatedId: notification.relatedId ?? undefined,
            relatedType: (notification.relatedType as 'task' | 'order' | 'project') ?? undefined
        };
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

export async function getNotifications(): Promise<Notification[]> {
    try {
        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50
        });
        return notifications.map(n => ({
            ...n,
            type: n.type as NotificationType,
            relatedId: n.relatedId ?? undefined,
            relatedType: (n.relatedType as 'task' | 'order' | 'project') ?? undefined
        }));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

export async function markNotificationAsRead(id: number): Promise<void> {
    try {
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        revalidatePath('/');
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

export async function getUnreadNotificationCount(): Promise<number> {
    try {
        return await prisma.notification.count({
            where: { read: false }
        });
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        return 0;
    }
}

export async function markAllNotificationsAsRead(): Promise<void> {
    try {
        await prisma.notification.updateMany({
            where: { read: false },
            data: { read: true }
        });
        revalidatePath('/');
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

export async function clearAllNotifications(): Promise<void> {
    try {
        await prisma.notification.deleteMany({});
        revalidatePath('/');
    } catch (error) {
        console.error('Error clearing notifications:', error);
        throw error;
    }
}

export async function getRelatedTask(taskId: number) {
    try {
        return await prisma.task.findUnique({
            where: { id: taskId },
            select: { projectId: true }
        });
    } catch (error) {
        console.error('Error fetching related task:', error);
        return null;
    }
}

export async function getRelatedOrder(orderId: number) {
    try {
        return await prisma.order.findUnique({
            where: { id: orderId },
            select: { projectId: true }
        });
    } catch (error) {
        console.error('Error fetching related order:', error);
        return null;
    }
}

