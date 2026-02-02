/**
 * @file notificationService.ts
 * @description Serwis zarządzania powiadomieniami w aplikacji
 * 
 * Funkcjonalności:
 * - Tworzenie powiadomień (z opcjonalnym browser push)
 * - Automatyczne sprawdzanie terminów zadań
 * - Zarządzanie uprawnieniami przeglądarki
 * 
 * Używa lokalnej bazy Dexie do przechowywania powiadomień
 * 
 * @module lib/notificationService
 */

import { db } from './db';
import { NotificationType } from '@/types';

/**
 * Serwis obsługi powiadomień
 */
export class NotificationService {
    /**
     * Tworzy nowe powiadomienie i (opcjonalnie) pokazuje browser push
     * 
     * @param type - Typ powiadomienia (task_deadline, task_completed, etc.)
     * @param title - Tytuł powiadomienia
     * @param message - Treść powiadomienia
     * @param relatedId - ID powiązanego elementu (opcjonalne)
     * @param relatedType - Typ powiązanego elementu (opcjonalne)
     */
    static async create(
        type: NotificationType,
        title: string,
        message: string,
        relatedId?: number,
        relatedType?: 'task' | 'order' | 'project'
    ) {
        // Zapisz w lokalnej bazie
        await db.notifications.add({
            type,
            title,
            message,
            read: false,
            createdAt: new Date(),
            relatedId,
            relatedType
        });

        // Pokaż browser push jeśli włączone i dostępne
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: message,
                    icon: '/icon.png',
                    badge: '/icon.png'
                });
            } catch (error) {
                console.error('Failed to show push notification:', error);
            }
        }
    }

    /**
     * Sprawdza terminy zadań i tworzy powiadomienia o zbliżających się deadline'ach
     * 
     * Sprawdza zadania z terminami:
     * - Przeterminowane (czerwone)
     * - Dziś
     * - Jutro
     * - Za 3 dni
     * - Za tydzień
     * 
     * Unika duplikowania powiadomień
     */
    static async checkDeadlines() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(0, 0, 0, 0);

        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        oneWeekFromNow.setHours(0, 0, 0, 0);

        // Pobierz nieukończone zadania z terminami
        const tasks = await db.tasks
            .filter(t => t.status !== 'Done' && t.isDeleted !== 1 && !!t.dueDate)
            .toArray();

        // Unikaj duplikatów - pobierz już istniejące powiadomienia
        const existingNotifications = await db.notifications
            .where({ type: 'task_deadline' })
            .toArray();

        const notifiedTaskIds = new Set(
            existingNotifications
                .filter(n => n.relatedType === 'task')
                .map(n => n.relatedId)
        );

        for (const task of tasks) {
            if (!task.dueDate || notifiedTaskIds.has(task.id!)) continue;

            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const timeDiff = dueDate.getTime() - now.getTime();
            const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            let shouldNotify = false;
            let message = '';

            if (daysUntilDue < 0) {
                // Przeterminowane
                shouldNotify = true;
                message = `Zadanie "${task.title}" jest zaległe (termin: ${dueDate.toLocaleDateString('pl-PL')})`;
            } else if (daysUntilDue === 0) {
                // Dziś
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się dzisiaj`;
            } else if (daysUntilDue === 1) {
                // Jutro
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się jutro`;
            } else if (daysUntilDue === 3) {
                // Za 3 dni
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się za 3 dni`;
            } else if (daysUntilDue === 7) {
                // Za tydzień
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się za tydzień`;
            }

            if (shouldNotify) {
                await this.create(
                    'task_deadline',
                    'Zbliżający się termin',
                    message,
                    task.id,
                    'task'
                );
            }
        }
    }

    /**
     * Prosi o uprawnienia do pokazywania powiadomień push w przeglądarce
     * @returns true jeśli uprawnienia przyznane, false w przeciwnym wypadku
     */
    static async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.log('Browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }
}
