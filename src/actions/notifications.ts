/**
 * @file notifications.ts
 * @description System powiadomień aplikacji
 * 
 * Odpowiada za:
 * - Tworzenie powiadomień różnych typów
 * - Zarządzanie stanem przeczytania
 * - Powiązania z zadaniami, zamówieniami i projektami
 * 
 * @module actions/notifications
 */
'use server'

import { prisma } from '@/lib/prisma'
import { Notification, NotificationType } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Tworzy nowe powiadomienie
 * @param type - Typ powiadomienia (info, warning, error, success)
 * @param title - Tytuł powiadomienia
 * @param message - Treść powiadomienia
 * @param relatedId - ID powiązanego obiektu (opcjonalne)
 * @param relatedType - Typ powiązanego obiektu: 'task', 'order', 'project'
 * @returns Utworzone powiadomienie
 * @throws Error w przypadku błędu bazy danych
 */
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
                relatedId,      // ID powiązanego obiektu
                relatedType,    // Typ obiektu do linkowania
                read: false,    // Domyślnie nieprzeczytane
                createdAt: new Date()
            }
        });
        revalidatePath('/');  // Powiadomienia są globalne
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

/**
 * Pobiera ostatnie 50 powiadomień
 * @returns Tablica powiadomień posortowana od najnowszych
 */
export async function getNotifications(): Promise<Notification[]> {
    try {
        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50  // Limit do 50 najnowszych
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

/**
 * Oznacza pojedyncze powiadomienie jako przeczytane
 * @param id - ID powiadomienia
 * @throws Error w przypadku błędu bazy danych
 */
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

/**
 * Pobiera liczbę nieprzeczytanych powiadomień
 * @returns Liczba nieprzeczytanych powiadomień
 */
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

/**
 * Oznacza wszystkie powiadomienia jako przeczytane
 * @throws Error w przypadku błędu bazy danych
 */
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

/**
 * Usuwa wszystkie powiadomienia (hard delete)
 * @throws Error w przypadku błędu bazy danych
 */
export async function clearAllNotifications(): Promise<void> {
    try {
        await prisma.notification.deleteMany({});
        revalidatePath('/');
    } catch (error) {
        console.error('Error clearing notifications:', error);
        throw error;
    }
}

/**
 * Pobiera projektId powiązany z zadaniem (dla nawigacji)
 * @param taskId - ID zadania
 * @returns Obiekt z projectId lub null
 */
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

/**
 * Pobiera projektId powiązany z zamówieniem (dla nawigacji)
 * @param orderId - ID zamówienia
 * @returns Obiekt z projectId lub null
 */
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
