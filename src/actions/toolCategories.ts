/**
 * @file toolCategories.ts
 * @description Zarządzanie kategoriami narzędzi
 * 
 * Odpowiada za:
 * - Pobieranie kategorii narzędzi
 * - Tworzenie nowych kategorii z kolorami
 * - Usuwanie kategorii
 * 
 * @module actions/toolCategories
 */
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ToolCategory } from "@/types"

/**
 * Pobiera wszystkie kategorie narzędzi
 * @returns Tablica kategorii posortowana alfabetycznie
 */
export async function getToolCategories() {
    try {
        const categories = await (prisma as any).toolCategory.findMany({
            orderBy: { name: 'asc' }
        });
        return categories as ToolCategory[];
    } catch (error) {
        console.error("Error fetching tool categories:", error);
        return [];
    }
}

/**
 * Tworzy nową kategorię narzędzi
 * @param name - Nazwa kategorii
 * @param color - Kolor kategorii (hex, domyślnie zielony)
 * @returns Obiekt z success, data (kategoria) lub error
 */
export async function createToolCategory(name: string, color: string = '#059669') {
    try {
        const category = await (prisma as any).toolCategory.create({
            data: { name, color }
        });
        revalidatePath('/management');
        return { success: true, data: category };
    } catch (error) {
        console.error("Error creating tool category:", error);
        return { success: false, error: "Failed to create category" };
    }
}

/**
 * Usuwa kategorię narzędzi (hard delete)
 * @param id - ID kategorii do usunięcia
 * @returns Obiekt z success lub error
 */
export async function deleteToolCategory(id: number) {
    try {
        await (prisma as any).toolCategory.delete({
            where: { id }
        });
        revalidatePath('/management');
        return { success: true };
    } catch (error) {
        console.error("Error deleting tool category:", error);
        return { success: false, error: "Failed to delete category" };
    }
}
