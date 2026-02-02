/**
 * @file costEstimates.ts
 * @description Zarządzanie wycenami kosztów (CostEstimateItem) dla projektów
 * 
 * Odpowiada za:
 * - CRUD pozycji wyceny kosztów
 * - Kalkulacje kosztowe z uwzględnieniem VAT
 * - Organizację kosztów w sekcje
 * 
 * @module actions/costEstimates
 */
'use server';

import { prisma } from '@/lib/prisma';
import { CostEstimateItem } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie pozycje wyceny kosztów dla projektu
 * @param projectId - ID projektu
 * @returns Tablica pozycji wyceny kosztów
 */
export async function getCostEstimates(projectId: number) {
    try {
        const items = await prisma.costEstimateItem.findMany({
            where: {
                projectId,
            },
        });

        return items;
    } catch (error) {
        console.error('Error fetching cost estimates:', error);
        return [];
    }
}

/**
 * Tworzy nową pozycję wyceny kosztów
 * @param data - Dane pozycji:
 *   - projectId: ID projektu
 *   - section: Sekcja/kategoria (np. "Materiały", "Robocizna")
 *   - description: Opis pozycji
 *   - quantity: Ilość
 *   - unit: Jednostka (szt., m², godz.)
 *   - unitNetPrice: Cena jednostkowa netto
 *   - taxRate: Stawka VAT (np. 23)
 * @returns Utworzona pozycja
 * @throws Error w przypadku błędu bazy danych
 */
export async function createCostEstimate(data: CostEstimateItem) {
    try {
        const { id: _id, ...rest } = data;
        const item = await prisma.costEstimateItem.create({
            data: {
                projectId: rest.projectId,
                section: rest.section,
                description: rest.description,
                quantity: rest.quantity,
                unit: rest.unit,
                unitNetPrice: rest.unitNetPrice,
                taxRate: rest.taxRate,
            },
        });
        revalidatePath(`/projects/${rest.projectId}`);
        return item;
    } catch (error) {
        console.error('Error creating cost estimate:', error);
        throw error;
    }
}

/**
 * Aktualizuje pozycję wyceny kosztów
 * @param id - ID pozycji
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowana pozycja
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateCostEstimate(id: number, data: Partial<CostEstimateItem>) {
    try {
        const { id: _unused, ...rest } = data;
        const item = await prisma.costEstimateItem.update({
            where: { id },
            data: rest,
        });
        revalidatePath(`/projects/${item.projectId}`);
        return item;
    } catch (error) {
        console.error('Error updating cost estimate:', error);
        throw error;
    }
}

/**
 * Usuwa pozycję wyceny kosztów (hard delete)
 * @param id - ID pozycji do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteCostEstimate(id: number) {
    try {
        // Najpierw pobierz pozycję dla revalidatePath
        const item = await prisma.costEstimateItem.findUnique({
            where: { id },
        });

        if (item) {
            await prisma.costEstimateItem.delete({
                where: { id },
            });
            revalidatePath(`/projects/${item.projectId}`);
        }
    } catch (error) {
        console.error('Error deleting cost estimate:', error);
        throw error;
    }
}
