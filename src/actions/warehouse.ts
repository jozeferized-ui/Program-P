/**
 * @file warehouse.ts
 * @description Zarządzanie magazynem (stany, przyjęcia, wydania)
 * 
 * Odpowiada za:
 * - CRUD pozycji magazynowych
 * - Rejestrację historii operacji magazynowych (IN/OUT)
 * - Śledzenie minimalnych stanów magazynowych
 * 
 * @module actions/warehouse
 */
'use server'

import { prisma } from '@/lib/prisma'
import { WarehouseItem, WarehouseHistoryItem } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Pobiera wszystkie aktywne pozycje magazynowe
 * @returns Tablica pozycji magazynowych posortowana alfabetycznie
 */
export async function getWarehouseItems(): Promise<WarehouseItem[]> {
    try {
        const items = await prisma.warehouseItem.findMany({
            where: { isDeleted: 0 },   // Tylko nieusunięte
            orderBy: { name: 'asc' }   // Sortuj po nazwie
        });
        // Mapowanie null na undefined
        return items.map(item => ({
            ...item,
            description: item.description ?? undefined,
            minQuantity: item.minQuantity ?? undefined,  // Minimalny stan
            category: item.category ?? undefined,
            location: item.location ?? undefined,        // Lokalizacja w magazynie
        }));
    } catch (error) {
        console.error('Error fetching warehouse items:', error);
        return [];
    }
}

/**
 * Tworzy nową pozycję magazynową
 * @param data - Dane pozycji:
 *   - name: Nazwa produktu
 *   - description: Opis (opcjonalne)
 *   - quantity: Aktualna ilość
 *   - unit: Jednostka (szt., kg, m, itp.)
 *   - minQuantity: Minimalny stan (alert)
 *   - category: Kategoria
 *   - location: Lokalizacja w magazynie
 * @returns Utworzona pozycja
 * @throws Error w przypadku błędu bazy danych
 */
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

/**
 * Aktualizuje pozycję magazynową
 * @param id - ID pozycji
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowana pozycja
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateWarehouseItem(id: number, data: Partial<WarehouseItem>): Promise<WarehouseItem> {
    try {
        const item = await prisma.warehouseItem.update({
            where: { id },
            data: {
                ...data,
                id: undefined,              // Nie aktualizuj ID
                lastUpdated: new Date()     // Zawsze aktualizuj datę
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

/**
 * Usuwa pozycję magazynową (soft delete)
 * @param id - ID pozycji do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
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

/**
 * Tworzy wpis w historii operacji magazynowych
 * @param data - Dane operacji:
 *   - itemId: ID pozycji magazynowej
 *   - type: 'IN' (przyjęcie) lub 'OUT' (wydanie)
 *   - quantity: Ilość
 *   - date: Data operacji
 *   - reason: Powód operacji (opcjonalne)
 *   - userId: ID użytkownika (opcjonalne)
 * @returns Utworzony wpis historii
 * @throws Error w przypadku błędu bazy danych
 */
export async function createWarehouseHistory(data: WarehouseHistoryItem): Promise<WarehouseHistoryItem> {
    try {
        const history = await prisma.warehouseHistoryItem.create({
            data: {
                itemId: data.itemId,
                type: data.type,        // 'IN' lub 'OUT'
                quantity: data.quantity,
                date: data.date,
                reason: data.reason,    // Np. "Zamówienie #123"
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

/**
 * Pobiera historię operacji dla danej pozycji magazynowej
 * @param itemId - ID pozycji magazynowej
 * @returns Tablica operacji posortowana od najnowszych
 */
export async function getWarehouseHistory(itemId: number): Promise<WarehouseHistoryItem[]> {
    try {
        const history = await prisma.warehouseHistoryItem.findMany({
            where: { itemId },
            orderBy: { date: 'desc' }  // Najnowsze na górze
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
