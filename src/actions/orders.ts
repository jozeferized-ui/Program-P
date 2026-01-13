'use server'

import { prisma } from '@/lib/prisma'
import { Order } from '@/types'
import { revalidatePath } from 'next/cache'

export async function getOrders(projectId: number): Promise<Order[]> {
    try {
        const orders = await prisma.order.findMany({
            where: {
                projectId,
                isDeleted: 0
            },
            orderBy: {
                date: 'desc'
            }
        });

        return orders.map((order: any) => ({
            ...order,
            taskId: order.taskId ?? undefined,
            supplierId: order.supplierId ?? undefined,
            netAmount: order.netAmount ?? undefined,
            taxRate: order.taxRate ?? undefined,
            quantity: order.quantity ?? undefined,
            unit: order.unit ?? undefined,
            notes: order.notes ?? undefined,
            url: order.url ?? undefined,
            status: order.status as 'Pending' | 'Ordered' | 'Delivered',
            deletedAt: order.deletedAt ?? undefined
        }));
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

interface ExtendedOrder extends Order {
    projectName: string;
    supplierName: string;
}

export async function getAllOrders(): Promise<ExtendedOrder[]> {
    try {
        const orders = await prisma.order.findMany({
            where: {
                isDeleted: 0
            },
            include: {
                project: {
                    select: { name: true }
                },
                supplier: {
                    select: { name: true }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return orders.map((order: any) => ({
            ...order,
            taskId: order.taskId ?? undefined,
            supplierId: order.supplierId ?? undefined,
            netAmount: order.netAmount ?? undefined,
            taxRate: order.taxRate ?? undefined,
            quantity: order.quantity ?? undefined,
            unit: order.unit ?? undefined,
            notes: order.notes ?? undefined,
            url: order.url ?? undefined,
            status: order.status as 'Pending' | 'Ordered' | 'Delivered',
            deletedAt: order.deletedAt ?? undefined,
            projectName: order.project?.name || 'Nieznany projekt',
            supplierName: order.supplier?.name || '-'
        }));
    } catch (error) {
        console.error('Error fetching all orders:', error);
        return [];
    }
}

export async function createOrder(data: Order): Promise<Order> {
    try {
        const order = await prisma.order.create({
            data: {
                projectId: data.projectId,
                taskId: data.taskId,
                supplierId: data.supplierId,
                title: data.title,
                amount: data.amount,
                netAmount: data.netAmount,
                taxRate: data.taxRate,
                status: data.status,
                date: data.date,
                quantity: data.quantity,
                unit: data.unit,
                notes: data.notes,
                url: data.url,
                isDeleted: 0
            }
        });

        revalidatePath(`/projects/${data.projectId}`);
        return {
            ...order,
            taskId: order.taskId ?? undefined,
            supplierId: order.supplierId ?? undefined,
            netAmount: order.netAmount ?? undefined,
            taxRate: order.taxRate ?? undefined,
            quantity: order.quantity ?? undefined,
            unit: order.unit ?? undefined,
            notes: order.notes ?? undefined,
            url: order.url ?? undefined,
            status: order.status as 'Pending' | 'Ordered' | 'Delivered',
            deletedAt: order.deletedAt ?? undefined
        };
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

export async function updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    try {
        // Use transaction to update order and associated expense
        const order = await prisma.$transaction(async (tx) => {
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    ...data,
                    id: undefined, // Prevent updating ID
                    projectId: undefined, // Prevent moving projects (usually)
                }
            });

            // Update associated expense if financial data changed
            if (data.amount !== undefined || data.netAmount !== undefined || data.taxRate !== undefined || data.title !== undefined) {
                await tx.expense.updateMany({
                    where: { orderId: id },
                    data: {
                        title: data.title ? `Zamówienie: ${data.title}` : undefined,
                        amount: data.amount,
                        netAmount: data.netAmount,
                        taxRate: data.taxRate,
                    }
                });
            }

            return updatedOrder;
        });

        revalidatePath(`/projects/${order.projectId}`);
        revalidatePath('/finances');
        return {
            ...order,
            taskId: order.taskId ?? undefined,
            supplierId: order.supplierId ?? undefined,
            netAmount: order.netAmount ?? undefined,
            taxRate: order.taxRate ?? undefined,
            quantity: order.quantity ?? undefined,
            unit: order.unit ?? undefined,
            notes: order.notes ?? undefined,
            url: order.url ?? undefined,
            status: order.status as 'Pending' | 'Ordered' | 'Delivered',
            deletedAt: order.deletedAt ?? undefined
        };
    } catch (error) {
        console.error('Error updating order:', error);
        throw error;
    }
}

export async function deleteOrder(id: number): Promise<void> {
    try {
        // Soft delete order
        const order = await prisma.order.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date()
            }
        });

        // Soft delete associated expenses
        await prisma.expense.updateMany({
            where: { orderId: id },
            data: {
                isDeleted: 1,
                deletedAt: new Date()
            }
        });

        revalidatePath(`/projects/${order.projectId}`);
    } catch (error) {
        console.error('Error deleting order:', error);
        throw error;
    }
}

export async function syncOrderToWarehouse(orderId: number) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) throw new Error('Order not found');
        if (order.addedToWarehouse) throw new Error('Order already added to warehouse');

        const quantity = order.quantity || 1;
        const unit = order.unit || 'szt.';

        // Use transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // Check if item exists in warehouse
            const existingItem = await tx.warehouseItem.findFirst({
                where: {
                    name: order.title,
                    isDeleted: 0
                }
            });

            if (existingItem) {
                // Update existing item
                await tx.warehouseItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + quantity,
                        lastUpdated: new Date()
                    }
                });

                await tx.warehouseHistoryItem.create({
                    data: {
                        itemId: existingItem.id,
                        type: 'IN',
                        quantity: quantity,
                        date: new Date(),
                        reason: `Zamówienie: ${order.title} (Projekt #${order.projectId})`
                    }
                });
            } else {
                // Create new item
                const newItem = await tx.warehouseItem.create({
                    data: {
                        name: order.title,
                        quantity: quantity,
                        unit: unit,
                        category: 'Zamówienia',
                        location: 'Magazyn',
                        lastUpdated: new Date(),
                        isDeleted: 0
                    }
                });

                await tx.warehouseHistoryItem.create({
                    data: {
                        itemId: newItem.id,
                        type: 'IN',
                        quantity: quantity,
                        date: new Date(),
                        reason: `Zamówienie: ${order.title} (Projekt #${order.projectId})`
                    }
                });
            }

            // Mark order as added to warehouse
            await tx.order.update({
                where: { id: orderId },
                data: { addedToWarehouse: true }
            });
        });

        revalidatePath(`/projects/${order.projectId}`);
        revalidatePath('/warehouse');
        return { success: true };
    } catch (error) {
        console.error('Error syncing order to warehouse:', error);
        throw error;
    }
}
