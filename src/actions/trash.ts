'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Get all deleted items
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

// Restore item
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
                // Also restore associated expenses
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

// Permanently delete item
export async function permanentlyDeleteItem(table: 'project' | 'client' | 'supplier' | 'order', id: number) {
    try {
        await prisma.$transaction(async (tx) => {
            switch (table) {
                case 'project':
                    // Delete related records first (cascade)
                    await tx.expense.deleteMany({ where: { projectId: id } });
                    await tx.task.deleteMany({ where: { projectId: id } });
                    await tx.order.deleteMany({ where: { projectId: id } });
                    await tx.resource.deleteMany({ where: { projectId: id } });
                    await tx.quotationItem.deleteMany({ where: { projectId: id } });
                    await tx.costEstimateItem.deleteMany({ where: { projectId: id } });
                    // Handle subprojects - set their parentProjectId to null
                    await tx.project.updateMany({
                        where: { parentProjectId: id },
                        data: { parentProjectId: null }
                    });
                    await tx.project.delete({ where: { id } });
                    break;
                case 'client':
                    // Cannot delete client with active projects - check first
                    const projectCount = await tx.project.count({ where: { clientId: id } });
                    if (projectCount > 0) {
                        throw new Error('Cannot delete client with existing projects');
                    }
                    await tx.client.delete({ where: { id } });
                    break;
                case 'supplier':
                    // Disconnect supplier from projects and orders, then delete
                    await tx.order.updateMany({
                        where: { supplierId: id },
                        data: { supplierId: null }
                    });
                    await tx.supplier.delete({ where: { id } });
                    break;
                case 'order':
                    // Delete related expenses first
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

// Get all tasks (for calendar)
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

// Get completed tasks (for history)
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

// Get completed projects (for history)
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

// Get price history (quotation items from accepted quotes)
export async function getPriceHistory() {
    try {
        const projects = await prisma.project.findMany({
            where: { quoteStatus: 'Zaakceptowana', isDeleted: 0 },
            include: { client: true },
        });

        const projectIds = projects.map(p => p.id);

        const quotationItems = await prisma.quotationItem.findMany({
            where: { projectId: { in: projectIds } },
        });

        type HistoryItem = typeof quotationItems[0] & {
            projectName: string;
            clientName: string;
            acceptedDate: Date | null;
        };

        const itemsWithDetails: HistoryItem[] = quotationItems.map(item => {
            const project = projects.find(p => p.id === item.projectId);
            return {
                ...item,
                projectName: project?.name || 'Nieznany projekt',
                clientName: project?.client?.name || 'Nieznany klient',
                acceptedDate: project?.acceptedDate || null,
            };
        });

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
