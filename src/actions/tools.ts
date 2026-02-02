/**
 * @file tools.ts
 * @description Zarządzanie narzędziami i sprzętem
 * 
 * Odpowiada za:
 * - CRUD narzędzi z kategoriami
 * - Przypisywanie narzędzi do pracowników
 * - Śledzenie przeglądów i dat ważności
 * - Obsługę statusów (Available, In Use, Maintenance, Lost)
 * 
 * @module actions/tools
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Tool } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie aktywne narzędzia z relacjami
 * Zawiera przypisanych pracowników, kategorię, przekazania i protokoły
 * 
 * @returns Tablica narzędzi posortowana alfabetycznie po nazwie
 */
export async function getTools() {
    try {
        const tools = await (prisma as any).tool.findMany({
            where: {
                isDeleted: 0,
            },
            include: {
                assignedEmployees: true,      // Przypisani pracownicy
                category: true,               // Kategoria narzędzia
                transferredTo: true,          // Aktualny posiadacz (przekazanie)
                protocols: {                  // Protokoły kontrolne
                    orderBy: { date: 'desc' },
                }
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Mapowanie na interfejs aplikacji
        return (tools || []).map((t: any) => ({
            ...t,
            assignedEmployees: (t.assignedEmployees || []).map((e: any) => ({
                ...e,
                status: e.status as 'Active' | 'Inactive',
                isDeleted: e.isDeleted || undefined
            })),
            status: t.status as 'Available' | 'In Use' | 'Maintenance' | 'Lost',
            lastInspectionDate: t.lastInspectionDate ?? undefined,
            inspectionExpiryDate: t.inspectionExpiryDate ?? undefined,
            protocolNumber: t.protocolNumber ?? undefined,
            model: t.model ?? undefined,
            categoryId: t.categoryId ?? undefined,
            category: t.category ?? undefined,
            protocols: (t.protocols || []).map((p: any) => ({
                ...p,
                data: p.content  // Mapuj content na data dla kompatybilności
            }))
        }));
    } catch (error) {
        console.error('Error fetching tools:', error);
        return [];
    }
}

/**
 * Pobiera pojedyncze narzędzie po ID
 * @param id - ID narzędzia
 * @returns Narzędzie z relacjami lub null
 */
export async function getToolById(id: number) {
    try {
        const tool = await (prisma as any).tool.findUnique({
            where: { id },
            include: {
                assignedEmployees: true,
                category: true,
                transferredTo: true,
                protocols: {
                    orderBy: { date: 'desc' }
                }
            },
        });

        if (!tool || (tool as any).isDeleted === 1) return null;

        const t = tool as any;
        return {
            ...t,
            assignedEmployees: (t.assignedEmployees || []).map((e: any) => ({
                ...e,
                status: e.status as 'Active' | 'Inactive',
            })),
            status: t.status as 'Available' | 'In Use' | 'Maintenance' | 'Lost',
            lastInspectionDate: t.lastInspectionDate ?? undefined,
            inspectionExpiryDate: t.inspectionExpiryDate ?? undefined,
            protocolNumber: t.protocolNumber ?? undefined,
            model: t.model ?? undefined,
            categoryId: t.categoryId ?? undefined,
            category: t.category ?? undefined,
            protocols: (t.protocols || []).map((p: any) => ({
                ...p,
                data: p.content
            }))
        };
    } catch (error) {
        console.error('Error fetching tool by id:', error);
        return null;
    }
}

/**
 * Tworzy nowe narzędzie
 * @param data - Dane narzędzia:
 *   - name: Nazwa narzędzia
 *   - brand: Marka
 *   - model: Model (opcjonalne)
 *   - serialNumber: Numer seryjny
 *   - status: Status (Available, In Use, Maintenance, Lost)
 *   - purchaseDate: Data zakupu
 *   - price: Cena zakupu
 *   - employeeIds: ID przypisanych pracowników
 *   - lastInspectionDate, inspectionExpiryDate: Daty przeglądów
 *   - protocolNumber: Numer protokołu
 *   - categoryId: ID kategorii
 * @returns Utworzone narzędzie
 * @throws Error w przypadku błędu bazy danych
 */
export async function createTool(data: Tool & { employeeIds?: number[] }) {
    try {
        const tool = await (prisma as any).tool.create({
            data: {
                name: data.name,
                brand: data.brand || "",
                model: data.model || null,
                serialNumber: data.serialNumber || "",
                status: data.status,
                purchaseDate: data.purchaseDate || new Date(),
                price: data.price || 0,
                assignedEmployees: {
                    connect: data.employeeIds?.map(id => ({ id })) || [],
                },
                lastInspectionDate: data.lastInspectionDate || null,
                inspectionExpiryDate: data.inspectionExpiryDate || null,
                protocolNumber: data.protocolNumber || null,
                categoryId: data.categoryId || null,
                isDeleted: 0,
            },
            include: {
                assignedEmployees: true,
                category: true
            }
        });
        revalidatePath('/management');

        const t = tool as any;
        return {
            ...t,
            assignedEmployees: (t.assignedEmployees || []).map((e: any) => ({
                ...e,
                status: e.status as 'Active' | 'Inactive',
            })),
            status: t.status as 'Available' | 'In Use' | 'Maintenance' | 'Lost',
            lastInspectionDate: t.lastInspectionDate || undefined,
            inspectionExpiryDate: t.inspectionExpiryDate || undefined,
            protocolNumber: t.protocolNumber || undefined,
            model: t.model || undefined
        };
    } catch (error) {
        console.error('Error in createTool:', error);
        throw error;
    }
}

/**
 * Aktualizuje narzędzie
 * Używa 'set' dla relacji z pracownikami (zastępuje wszystkie powiązania)
 * 
 * @param id - ID narzędzia
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowane narzędzie
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateTool(id: number, data: Partial<Tool> & { employeeIds?: number[] }) {
    try {
        const updateData: any = {
            name: data.name,
            brand: data.brand,
            model: data.model === "" ? null : data.model,
            serialNumber: data.serialNumber,
            status: data.status,
            purchaseDate: data.purchaseDate,
            price: data.price,
            lastInspectionDate: data.lastInspectionDate,
            inspectionExpiryDate: data.inspectionExpiryDate,
            protocolNumber: data.protocolNumber,
            categoryId: data.categoryId,
        };

        // Aktualizuj przypisania pracowników jeśli podano
        if (data.employeeIds) {
            updateData.assignedEmployees = {
                set: data.employeeIds.map(id => ({ id })),
            };
        }

        const tool = await (prisma as any).tool.update({
            where: { id },
            data: updateData,
            include: {
                assignedEmployees: true,
                category: true
            }
        });
        revalidatePath('/management');

        const t = tool as any;
        return {
            ...t,
            assignedEmployees: (t.assignedEmployees || []).map((e: any) => ({
                ...e,
                status: e.status as 'Active' | 'Inactive',
            })),
            status: t.status as 'Available' | 'In Use' | 'Maintenance' | 'Lost',
            lastInspectionDate: t.lastInspectionDate || undefined,
            inspectionExpiryDate: t.inspectionExpiryDate || undefined,
            protocolNumber: t.protocolNumber || undefined,
            model: t.model || undefined
        };
    } catch (error) {
        console.error('Error in updateTool:', error);
        throw error;
    }
}

/**
 * Usuwa narzędzie (soft delete)
 * @param id - ID narzędzia do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteTool(id: number) {
    try {
        await (prisma as any).tool.update({
            where: { id },
            data: {
                isDeleted: 1,
            },
        });
        revalidatePath('/management');
    } catch (error) {
        console.error('Error deleting tool:', error);
        throw error;
    }
}
