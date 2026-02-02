/**
 * @file quotations.ts
 * @description Zarządzanie pozycjami wyceny (QuotationItem) dla projektów
 * 
 * Odpowiada za:
 * - CRUD pozycji wyceny
 * - Zarządzanie sekcjami wyceny (zmiana nazwy, usuwanie)
 * - Sugestie cen na podstawie historycznych wycen
 * 
 * @module actions/quotations
 */
'use server';

import { prisma } from '@/lib/prisma';
import { QuotationItem } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie pozycje wyceny dla danego projektu
 * @param projectId - ID projektu
 * @returns Tablica pozycji wyceny
 */
export async function getQuotationItems(projectId: number) {
    try {
        const items = await prisma.quotationItem.findMany({
            where: {
                projectId,
            },
        });
        // Mapowanie null na undefined
        return items.map(item => ({
            ...item,
            margin: item.margin ?? undefined,              // Marża %
            priceWithMargin: item.priceWithMargin ?? undefined,
            section: item.section ?? undefined,            // Nazwa sekcji
        }));
    } catch (error) {
        console.error('Error fetching quotation items:', error);
        return [];
    }
}

/**
 * Tworzy nową pozycję wyceny
 * @param data - Dane pozycji:
 *   - description: Opis pozycji
 *   - quantity: Ilość
 *   - unit: Jednostka (np. szt., m², godz.)
 *   - unitPrice: Cena jednostkowa
 *   - margin: Marża % (opcjonalne)
 *   - total: Suma
 *   - section: Nazwa sekcji (opcjonalne)
 * @returns Utworzona pozycja
 * @throws Error w przypadku błędu bazy danych
 */
export async function createQuotationItem(data: QuotationItem) {
    try {
        const { id: _id, ...rest } = data;
        const item = await prisma.quotationItem.create({
            data: {
                projectId: rest.projectId,
                description: rest.description,
                quantity: rest.quantity,
                unit: rest.unit,
                unitPrice: rest.unitPrice,
                margin: rest.margin,
                priceWithMargin: rest.priceWithMargin,
                total: rest.total,
                section: rest.section,
            },
        });
        revalidatePath(`/projects/${rest.projectId}`);
        return item;
    } catch (error) {
        console.error('Error creating quotation item:', error);
        throw error;
    }
}

/**
 * Aktualizuje pozycję wyceny
 * @param id - ID pozycji
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowana pozycja
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateQuotationItem(id: number, data: Partial<QuotationItem>) {
    try {
        const { id: _unused, ...rest } = data;
        const item = await prisma.quotationItem.update({
            where: { id },
            data: rest,
        });
        revalidatePath(`/projects/${item.projectId}`);
        return item;
    } catch (error) {
        console.error('Error updating quotation item:', error);
        throw error;
    }
}

/**
 * Usuwa pozycję wyceny (hard delete)
 * @param id - ID pozycji do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteQuotationItem(id: number) {
    try {
        const item = await prisma.quotationItem.findUnique({ where: { id } });
        if (item) {
            await prisma.quotationItem.delete({ where: { id } });
            revalidatePath(`/projects/${item.projectId}`);
        }
    } catch (error) {
        console.error('Error deleting quotation item:', error);
        throw error;
    }
}

/**
 * Zmienia nazwę sekcji wyceny dla wszystkich pozycji w projekcie
 * @param projectId - ID projektu
 * @param oldName - Aktualna nazwa sekcji
 * @param newName - Nowa nazwa sekcji
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateQuotationSection(projectId: number, oldName: string, newName: string) {
    try {
        await prisma.quotationItem.updateMany({
            where: {
                projectId,
                section: oldName,
            },
            data: {
                section: newName,
            },
        });
        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error('Error updating quotation section:', error);
        throw error;
    }
}

/**
 * Usuwa wszystkie pozycje z danej sekcji wyceny
 * @param projectId - ID projektu
 * @param sectionName - Nazwa sekcji do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteQuotationSection(projectId: number, sectionName: string) {
    try {
        await prisma.quotationItem.deleteMany({
            where: {
                projectId,
                section: sectionName,
            },
        });
        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error('Error deleting quotation section:', error);
        throw error;
    }
}

/**
 * Pobiera sugestie cen na podstawie historycznych zaakceptowanych wycen
 * Szuka pozycji o podobnym opisie i oblicza średnie ceny
 * 
 * @param query - Tekst do wyszukania (min. 3 znaki)
 * @returns Tablica sugestii z:
 *   - description: Opis pozycji
 *   - avgPrice: Średnia cena jednostkowa
 *   - avgMargin: Średnia marża
 *   - lastPrice: Ostatnio użyta cena
 *   - lastMargin: Ostatnio użyta marża
 *   - unit: Jednostka
 *   - usageCount: Ile razy użyto
 */
export async function getPriceSuggestions(query: string) {
    if (query.length < 3) return [];  // Minimum 3 znaki

    try {
        // Szukaj tylko w zaakceptowanych wycenach
        const items = await prisma.quotationItem.findMany({
            where: {
                project: {
                    quoteStatus: 'Zaakceptowana',
                },
                description: {
                    contains: query,
                },
            },
            include: {
                project: {
                    select: {
                        acceptedDate: true,  // Do sortowania
                    },
                },
            },
            orderBy: {
                project: {
                    acceptedDate: 'desc',  // Najnowsze pierwsze
                },
            },
            take: 100,  // Limit wyników
        });

        // Grupuj po opisie
        const grouped: Record<string, typeof items> = {};
        items.forEach(item => {
            if (!grouped[item.description]) {
                grouped[item.description] = [];
            }
            grouped[item.description].push(item);
        });

        // Oblicz średnie i zwróć top 5
        return Object.entries(grouped).map(([description, groupItems]) => {
            const avgPrice = groupItems.reduce((sum, item) => sum + item.unitPrice, 0) / groupItems.length;
            const avgMargin = groupItems.reduce((sum, item) => sum + (item.margin || 0), 0) / groupItems.length;
            const lastUsed = groupItems[0];  // Najnowsza (już posortowane)

            return {
                description,
                avgPrice,
                avgMargin,
                lastPrice: lastUsed.unitPrice,
                lastMargin: lastUsed.margin || 0,
                unit: lastUsed.unit,
                usageCount: groupItems.length,
            };
        }).slice(0, 5);
    } catch (error) {
        console.error('Error fetching price suggestions:', error);
        return [];
    }
}
