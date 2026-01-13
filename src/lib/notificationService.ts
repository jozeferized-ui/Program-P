import { db } from './db';
import { NotificationType } from '@/types';

export class NotificationService {
    /**
     * Create a new notification
     */
    static async create(
        type: NotificationType,
        title: string,
        message: string,
        relatedId?: number,
        relatedType?: 'task' | 'order' | 'project'
    ) {
        await db.notifications.add({
            type,
            title,
            message,
            read: false,
            createdAt: new Date(),
            relatedId,
            relatedType
        });

        // If browser push notifications are enabled and supported, send one
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
     * Check for upcoming task deadlines and create notifications
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

        // Get all tasks that are not done and not deleted
        const tasks = await db.tasks
            .filter(t => t.status !== 'Done' && t.isDeleted !== 1 && !!t.dueDate)
            .toArray();

        // Get existing deadline notifications to avoid duplicates
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
                // Overdue
                shouldNotify = true;
                message = `Zadanie "${task.title}" jest zaległe (termin: ${dueDate.toLocaleDateString('pl-PL')})`;
            } else if (daysUntilDue === 0) {
                // Due today
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się dzisiaj`;
            } else if (daysUntilDue === 1) {
                // Due tomorrow
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się jutro`;
            } else if (daysUntilDue === 3) {
                // Due in 3 days
                shouldNotify = true;
                message = `Zadanie "${task.title}" kończy się za 3 dni`;
            } else if (daysUntilDue === 7) {
                // Due in 1 week
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
     * Request browser push notification permission
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
