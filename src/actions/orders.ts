/**
 * @file orders.ts
 * @description Zarządzanie zamówieniami projektów
 * 
 * Odpowiada za:
 * - CRUD zamówień (z powiązaniem do projektu, zadania, dostawcy)
 * - Synchronizację z magazynem (automatyczne dodawanie pozycji)
 * - Aktualizację powiązanych wydatków przy zmianach zamówienia
 * - Soft delete z kaskadowym usuwaniem wydatków
 * 
 * @module actions/orders
 */
'use server'

import { prisma } from '@/lib/prisma'
import { Order } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Pobiera zamówienia dla projektu
 * @param projectId - ID projektu
 * @returns Tablica zamówień posortowana od najnowszych
 */
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

        // Mapowanie null na undefined
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

/**
 * Zamówienie rozszerzone o nazwy projektu i dostawcy
 */
interface ExtendedOrder extends Order {
    projectName: string;
    supplierName: string;
}

/**
 * Pobiera wszystkie zamówienia ze wszystkich projektów
 * (używane w widoku globalnym zamówień)
 * 
 * @returns Tablica zamówień z nazwami projektu i dostawcy
 */
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

/**
 * Tworzy nowe zamówienie
 * @param data - Dane zamówienia:
 *   - projectId: ID projektu
 *   - taskId: ID zadania (opcjonalne)
 *   - supplierId: ID dostawcy (opcjonalne)
 *   - title: Nazwa/opis zamówienia
 *   - amount: Kwota brutto
 *   - netAmount: Kwota netto (opcjonalne)
 *   - taxRate: Stawka VAT (opcjonalne)
 *   - status: 'Pending', 'Ordered', 'Delivered'
 *   - date: Data zamówienia
 *   - quantity, unit: Ilość i jednostka (opcjonalne)
 *   - notes, url: Dodatkowe info (opcjonalne)
 * @returns Utworzone zamówienie
 * @throws Error w przypadku błędu bazy danych
 */
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

/**
 * Aktualizuje zamówienie
 * Automatycznie aktualizuje powiązane wydatki przy zmianie kwot
 * 
 * @param id - ID zamówienia
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowane zamówienie
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateOrder(id: number, data: Partial<Order>): Promise<Order> {
    try {
        // Użyj transakcji dla spójności danych
        const order = await prisma.$transaction(async (tx) => {
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    ...data,
                    id: undefined,        // Nie aktualizuj ID
                    projectId: undefined, // Nie przenoś między projektami
                }
            });

            // Aktualizuj powiązane wydatki jeśli zmieniono dane finansowe
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

/**
 * Usuwa zamówienie (soft delete)
 * Kaskadowo usuwa również powiązane wydatki
 * 
 * @param id - ID zamówienia do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteOrder(id: number): Promise<void> {
    try {
        // Soft delete zamówienia
        const order = await prisma.order.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date()
            }
        });

        // Soft delete powiązanych wydatków
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

/**
 * Synchronizuje zamówienie z magazynem
 * Dodaje pozycję do magazynu lub zwiększa ilość istniejącej
 * Tworzy wpis w historii magazynowej
 * 
 * @param orderId - ID zamówienia do zsynchronizowania
 * @returns Obiekt z success: true
 * @throws Error jeśli zamówienie już dodane lub błąd bazy danych
 */
export async function syncOrderToWarehouse(orderId: number) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) throw new Error('Order not found');
        if (order.addedToWarehouse) throw new Error('Order already added to warehouse');

        const quantity = order.quantity || 1;
        const unit = order.unit || 'szt.';

        // Transakcja dla atomowości operacji
        await prisma.$transaction(async (tx) => {
            // Sprawdź czy pozycja już istnieje w magazynie
            const existingItem = await tx.warehouseItem.findFirst({
                where: {
                    name: order.title,
                    isDeleted: 0
                }
            });

            if (existingItem) {
                // Zwiększ ilość istniejącej pozycji
                await tx.warehouseItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + quantity,
                        lastUpdated: new Date()
                    }
                });

                // Dodaj wpis historii (przyjęcie)
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
                // Utwórz nową pozycję magazynową
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

                // Dodaj wpis historii
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

            // Oznacz zamówienie jako dodane do magazynu
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
