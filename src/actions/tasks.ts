'use server';

import { prisma } from '@/lib/prisma';
import { Task, TaskStatus, Priority } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getTasks(projectId: number) {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                projectId,
                isDeleted: 0,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return tasks.map(t => {
            const { checklist, subtasks, ...rest } = t;

            // Safely parse JSON fields
            let parsedChecklist;
            let parsedSubtasks;

            try {
                parsedChecklist = checklist ? JSON.parse(checklist) : undefined;
            } catch {
                console.warn(`Failed to parse checklist for task ${t.id}`);
                parsedChecklist = undefined;
            }

            try {
                parsedSubtasks = subtasks ? JSON.parse(subtasks) : undefined;
            } catch {
                console.warn(`Failed to parse subtasks for task ${t.id}`);
                parsedSubtasks = undefined;
            }

            return {
                ...rest,
                description: t.description || undefined,
                dueDate: t.dueDate || undefined,
                checklist: parsedChecklist,
                subtasks: parsedSubtasks,
                deletedAt: t.deletedAt || undefined,
                status: t.status as TaskStatus,
                priority: t.priority as Priority,
            };
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

export async function createTask(data: Task) {
    try {
        const { id: _id, checklist, subtasks, ...rest } = data;
        const task = await prisma.task.create({
            data: {
                projectId: rest.projectId,
                title: rest.title,
                description: rest.description,
                status: rest.status,
                priority: rest.priority,
                dueDate: rest.dueDate,
                checklist: checklist ? JSON.stringify(checklist) : undefined,
                subtasks: subtasks ? JSON.stringify(subtasks) : undefined,
                isDeleted: 0,
            },
        });
        revalidatePath(`/projects/${rest.projectId}`);
        return task;
    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
}

export async function updateTask(id: number, data: Partial<Task>) {
    try {
        const { checklist, subtasks, id: _unused, ...rest } = data;

        const task = await prisma.task.update({
            where: { id },
            data: {
                ...rest,
                checklist: checklist ? JSON.stringify(checklist) : undefined,
                subtasks: subtasks ? JSON.stringify(subtasks) : undefined,
            },
        });
        revalidatePath(`/projects/${task.projectId}`);
        return task;
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

export async function deleteTask(id: number) {
    try {
        const task = await prisma.task.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date(),
            },
        });
        revalidatePath(`/projects/${task.projectId}`);
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
}
