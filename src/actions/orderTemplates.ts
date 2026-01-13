'use server';

import { prisma } from '@/lib/prisma';
import { OrderTemplate } from '@/types';

export async function getOrderTemplates(): Promise<OrderTemplate[]> {
    try {
        const templates = await prisma.orderTemplate.findMany();
        return templates;
    } catch (error) {
        console.error('Error fetching order templates:', error);
        return [];
    }
}
