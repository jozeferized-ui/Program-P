/**
 * @file tasks.ts
 * @description Zarządzanie zadaniami projektów
 * 
 * Odpowiada za:
 * - CRUD zadań (tworzenie, odczyt, aktualizacja, usuwanie)
 * - Parsowanie JSON dla checklist i subtasks
 * - Soft delete zadań
 * 
 * @module actions/tasks
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Task, TaskStatus, Priority } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie zadania dla danego projektu
 * @param projectId - ID projektu
 * @returns Tablica zadań z parsowanymi checklistami i subtaskami
 */
export async function getTasks(projectId: number) {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                projectId,
                isDeleted: 0,  // Tylko nieusunięte zadania
            },
            orderBy: {
                createdAt: 'desc',  // Najnowsze na górze
            },
        });

        return tasks.map(t => {
            const { checklist, subtasks, ...rest } = t;

            // Bezpieczne parsowanie pól JSON
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
                status: t.status as TaskStatus,      // 'Todo' | 'In Progress' | 'Done'
                priority: t.priority as Priority,    // 'Low' | 'Medium' | 'High'
            };
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

/**
 * Tworzy nowe zadanie
 * @param data - Dane zadania (tytuł, opis, status, priorytet, termin, checklist, subtasks)
 * @returns Utworzone zadanie
 * @throws Error w przypadku błędu bazy danych
 */
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
                checklist: checklist ? JSON.stringify(checklist) : undefined,  // Serializacja do JSON
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

/**
 * Aktualizuje istniejące zadanie
 * @param id - ID zadania
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowane zadanie
 * @throws Error w przypadku błędu bazy danych
 */
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

/**
 * Usuwa zadanie (soft delete)
 * @param id - ID zadania do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
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
