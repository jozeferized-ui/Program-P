/**
 * @file trash.ts
 * @description Kosz - zarządzanie usuniętymi elementami i historia
 * 
 * Odpowiada za:
 * - Pobieranie usuniętych elementów (projekty, klienci, dostawcy, zamówienia)
 * - Przywracanie elementów z kosza
 * - Trwałe usuwanie (wraz z powiązanymi danymi)
 * - Pobieranie danych historycznych (zadania, projekty, historia cen)
 * 
 * @module actions/trash
 */
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie usunięte elementy
 * @returns Obiekt z tablicami: projects, clients, suppliers, orders
 */
export async function getDeletedItems() {
    try {
        const [projects, clients, suppliers, orders] = await Promise.all([
            prisma.project.findMany({
                where: { isDeleted: 1 },
                orderBy: { deletedAt: 'desc' },
            }),
            prisma.client.findMany({
                where: { isDeleted: 1 },
                orderBy: { deletedAt: 'desc' },
            }),
            prisma.supplier.findMany({
                where: { isDeleted: 1 },
                orderBy: { deletedAt: 'desc' },
            }),
            prisma.order.findMany({
                where: { isDeleted: 1 },
                orderBy: { deletedAt: 'desc' },
            }),
        ]);

        return { projects, clients, suppliers, orders };
    } catch (error) {
        console.error('Error fetching deleted items:', error);
        return { projects: [], clients: [], suppliers: [], orders: [] };
    }
}

/**
 * Przywraca element z kosza (odznacza jako usunięty)
 * Dla zamówień przywraca również powiązane wydatki
 * 
 * @param table - Typ elementu: 'project', 'client', 'supplier', 'order'
 * @param id - ID elementu do przywrócenia
 * @returns Obiekt z success: true
 * @throws Error w przypadku błędu bazy danych
 */
export async function restoreItem(table: 'project' | 'client' | 'supplier' | 'order', id: number) {
    try {
        const updateData = { isDeleted: 0, deletedAt: null };

        switch (table) {
            case 'project':
                await prisma.project.update({ where: { id }, data: updateData });
                revalidatePath('/projects');
                break;
            case 'client':
                await prisma.client.update({ where: { id }, data: updateData });
                revalidatePath('/clients');
                break;
            case 'supplier':
                await prisma.supplier.update({ where: { id }, data: updateData });
                revalidatePath('/suppliers');
                break;
            case 'order':
                // Przywróć zamówienie wraz z powiązanymi wydatkami
                await prisma.$transaction(async (tx) => {
                    await tx.order.update({ where: { id }, data: updateData });
                    await tx.expense.updateMany({
                        where: { orderId: id },
                        data: updateData
                    });
                });
                revalidatePath('/projects');
                break;
        }

        revalidatePath('/trash');
        return { success: true };
    } catch (error) {
        console.error('Error restoring item:', error);
        throw error;
    }
}

/**
 * Trwale usuwa element (hard delete)
 * Usuwa również wszystkie powiązane dane (cascade)
 * 
 * @param table - Typ elementu: 'project', 'client', 'supplier', 'order'
 * @param id - ID elementu do usunięcia
 * @returns Obiekt z success: true
 * @throws Error jeśli klient ma projekty lub błąd bazy danych
 */
export async function permanentlyDeleteItem(table: 'project' | 'client' | 'supplier' | 'order', id: number) {
    try {
        await prisma.$transaction(async (tx) => {
            switch (table) {
                case 'project':
                    // Usuń wszystkie powiązane rekordy (cascade)
                    await tx.expense.deleteMany({ where: { projectId: id } });
                    await tx.task.deleteMany({ where: { projectId: id } });
                    await tx.order.deleteMany({ where: { projectId: id } });
                    await tx.resource.deleteMany({ where: { projectId: id } });
                    await tx.quotationItem.deleteMany({ where: { projectId: id } });
                    await tx.costEstimateItem.deleteMany({ where: { projectId: id } });
                    // Odłącz podprojekty (ustaw parentProjectId na null)
                    await tx.project.updateMany({
                        where: { parentProjectId: id },
                        data: { parentProjectId: null }
                    });
                    await tx.project.delete({ where: { id } });
                    break;

                case 'client':
                    // Sprawdź czy klient ma projekty
                    const projectCount = await tx.project.count({ where: { clientId: id } });
                    if (projectCount > 0) {
                        throw new Error('Cannot delete client with existing projects');
                    }
                    await tx.client.delete({ where: { id } });
                    break;

                case 'supplier':
                    // Odłącz dostawcę od zamówień, potem usuń
                    await tx.order.updateMany({
                        where: { supplierId: id },
                        data: { supplierId: null }
                    });
                    await tx.supplier.delete({ where: { id } });
                    break;

                case 'order':
                    // Usuń powiązane wydatki, potem zamówienie
                    await tx.expense.deleteMany({ where: { orderId: id } });
                    await tx.order.delete({ where: { id } });
                    break;
            }
        });

        revalidatePath('/trash');
        return { success: true };
    } catch (error) {
        console.error('Error permanently deleting item:', error);
        throw error;
    }
}

/**
 * Pobiera wszystkie aktywne zadania (dla kalendarza)
 * @returns Tablica zadań nieoznaczonych jako usunięte
 */
export async function getAllTasks() {
    try {
        const tasks = await prisma.task.findMany({
            where: { isDeleted: 0 },
            orderBy: { createdAt: 'desc' },
        });
        return tasks.map(t => ({
            ...t,
            description: t.description || undefined,
            dueDate: t.dueDate || undefined,
            deletedAt: t.deletedAt || undefined,
        }));
    } catch (error) {
        console.error('Error fetching all tasks:', error);
        return [];
    }
}

/**
 * Pobiera ukończone zadania (dla historii)
 * @returns Tablica zadań ze statusem 'Done'
 */
export async function getCompletedTasks() {
    try {
        const tasks = await prisma.task.findMany({
            where: { status: 'Done', isDeleted: 0 },
            orderBy: { dueDate: 'desc' },
        });
        return tasks.map(t => ({
            ...t,
            description: t.description || undefined,
            dueDate: t.dueDate || undefined,
            deletedAt: t.deletedAt || undefined,
        }));
    } catch (error) {
        console.error('Error fetching completed tasks:', error);
        return [];
    }
}

/**
 * Pobiera ukończone projekty (dla historii)
 * @returns Tablica projektów ze statusem 'Completed'
 */
export async function getCompletedProjects() {
    try {
        const projects = await prisma.project.findMany({
            where: { status: 'Completed', isDeleted: 0 },
            orderBy: { endDate: 'desc' },
        });
        return projects;
    } catch (error) {
        console.error('Error fetching completed projects:', error);
        return [];
    }
}

/**
 * Pobiera historię cen (pozycje wycen z zaakceptowanych projektów)
 * Używane do analizy historycznych wycen
 * 
 * @returns Tablica pozycji wycen z informacjami o projekcie i kliencie
 */
export async function getPriceHistory() {
    try {
        // Pobierz projekty z zaakceptowaną wyceną
        const projects = await prisma.project.findMany({
            where: { quoteStatus: 'Zaakceptowana', isDeleted: 0 },
            include: { client: true },
        });

        const projectIds = projects.map(p => p.id);

        // Pobierz pozycje wycen z tych projektów
        const quotationItems = await prisma.quotationItem.findMany({
            where: { projectId: { in: projectIds } },
        });

        // Typ dla rozszerzonej pozycji z danymi projektu
        type HistoryItem = typeof quotationItems[0] & {
            projectName: string;
            clientName: string;
            acceptedDate: Date | null;
        };

        // Połącz z danymi projektu
        const itemsWithDetails: HistoryItem[] = quotationItems.map(item => {
            const project = projects.find(p => p.id === item.projectId);
            return {
                ...item,
                projectName: project?.name || 'Nieznany projekt',
                clientName: project?.client?.name || 'Nieznany klient',
                acceptedDate: project?.acceptedDate || null,
            };
        });

        // Sortuj od najnowszych
        return itemsWithDetails.sort((a, b) => {
            if (!a.acceptedDate && !b.acceptedDate) return 0;
            if (!a.acceptedDate) return 1;
            if (!b.acceptedDate) return -1;
            return new Date(b.acceptedDate).getTime() - new Date(a.acceptedDate).getTime();
        });
    } catch (error) {
        console.error('Error fetching price history:', error);
        return [];
    }
}
