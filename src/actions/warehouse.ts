'use server'

import { prisma } from '@/lib/prisma'
import { WarehouseItem, WarehouseHistoryItem } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getWarehouseItems(): Promise<WarehouseItem[]> {
    try {
        const items = await prisma.warehouseItem.findMany({
            where: { isDeleted: 0 },
            orderBy: { name: 'asc' }
        });
        return items.map(item => ({
            ...item,
            description: item.description ?? undefined,
            minQuantity: item.minQuantity ?? undefined,
            category: item.category ?? undefined,
            location: item.location ?? undefined,
        }));
    } catch (error) {
        console.error('Error fetching warehouse items:', error);
        return [];
    }
}

export async function createWarehouseItem(data: WarehouseItem): Promise<WarehouseItem> {
    try {
        const item = await prisma.warehouseItem.create({
            data: {
                name: data.name,
                description: data.description,
                quantity: data.quantity,
                unit: data.unit,
                minQuantity: data.minQuantity,
                category: data.category,
                location: data.location,
                lastUpdated: new Date(),
                isDeleted: 0
            }
        });
        revalidatePath('/warehouse');
        return {
            ...item,
            description: item.description ?? undefined,
            minQuantity: item.minQuantity ?? undefined,
            category: item.category ?? undefined,
            location: item.location ?? undefined,
        };
    } catch (error) {
        console.error('Error creating warehouse item:', error);
        throw error;
    }
}

export async function updateWarehouseItem(id: number, data: Partial<WarehouseItem>): Promise<WarehouseItem> {
    try {
        const item = await prisma.warehouseItem.update({
            where: { id },
            data: {
                ...data,
                id: undefined,
                lastUpdated: new Date()
            }
        });
        revalidatePath('/warehouse');
        return {
            ...item,
            description: item.description ?? undefined,
            minQuantity: item.minQuantity ?? undefined,
            category: item.category ?? undefined,
            location: item.location ?? undefined,
        };
    } catch (error) {
        console.error('Error updating warehouse item:', error);
        throw error;
    }
}

export async function deleteWarehouseItem(id: number): Promise<void> {
    try {
        await prisma.warehouseItem.update({
            where: { id },
            data: { isDeleted: 1 }
        });
        revalidatePath('/warehouse');
    } catch (error) {
        console.error('Error deleting warehouse item:', error);
        throw error;
    }
}

export async function createWarehouseHistory(data: WarehouseHistoryItem): Promise<WarehouseHistoryItem> {
    try {
        const history = await prisma.warehouseHistoryItem.create({
            data: {
                itemId: data.itemId,
                type: data.type,
                quantity: data.quantity,
                date: data.date,
                reason: data.reason,
                userId: data.userId
            }
        });
        revalidatePath('/warehouse');
        return {
            ...history,
            type: history.type as 'IN' | 'OUT',
            reason: history.reason ?? undefined,
            userId: history.userId ?? undefined
        };
    } catch (error) {
        console.error('Error creating warehouse history:', error);
        throw error;
    }
}

export async function getWarehouseHistory(itemId: number): Promise<WarehouseHistoryItem[]> {
    try {
        const history = await prisma.warehouseHistoryItem.findMany({
            where: { itemId },
            orderBy: { date: 'desc' }
        });
        return history.map(h => ({
            ...h,
            type: h.type as 'IN' | 'OUT',
            reason: h.reason ?? undefined,
            userId: h.userId ?? undefined
        }));
    } catch (error) {
        console.error('Error fetching warehouse history:', error);
        return [];
    }
}
