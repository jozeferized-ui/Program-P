/**
 * @file orderTemplates.ts
 * @description Szablony zamówień
 * 
 * Odpowiada za:
 * - Pobieranie szablonów zamówień do szybkiego tworzenia nowych zamówień
 * 
 * @module actions/orderTemplates
 */
'use server';

import { prisma } from '@/lib/prisma';
import { OrderTemplate } from '@/types';

/**
 * Pobiera wszystkie szablony zamówień
 * @returns Tablica szablonów zamówień
 */
export async function getOrderTemplates(): Promise<OrderTemplate[]> {
    try {
        const templates = await prisma.orderTemplate.findMany();
        return templates;
    } catch (error) {
        console.error('Error fetching order templates:', error);
        return [];
    }
}
