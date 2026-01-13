'use server';

import { prisma } from '@/lib/prisma';
import { QuotationItem } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getQuotationItems(projectId: number) {
    try {
        const items = await prisma.quotationItem.findMany({
            where: {
                projectId,
            },
        });
        return items.map(item => ({
            ...item,
            margin: item.margin ?? undefined,
            priceWithMargin: item.priceWithMargin ?? undefined,
            section: item.section ?? undefined,
        }));
    } catch (error) {
        console.error('Error fetching quotation items:', error);
        return [];
    }
}

export async function createQuotationItem(data: QuotationItem) {
    try {
        const { id, ...rest } = data;
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

export async function updateQuotationItem(id: number, data: Partial<QuotationItem>) {
    try {
        const { id: _, ...rest } = data;
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

export async function updateQuotationSection(projectId: number, oldName: string, newName: string) {
    try {
        // Prisma doesn't support updateMany with where clause on the same field being updated easily if we want to be precise,
        // but here we just want to rename all items in a section.
        // However, section is just a string field.
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

export async function getPriceSuggestions(query: string) {
    if (query.length < 3) return [];

    try {
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
                        acceptedDate: true,
                    },
                },
            },
            orderBy: {
                project: {
                    acceptedDate: 'desc',
                },
            },
            take: 100,
        });

        // Group by description
        const grouped: Record<string, typeof items> = {};
        items.forEach(item => {
            if (!grouped[item.description]) {
                grouped[item.description] = [];
            }
            grouped[item.description].push(item);
        });

        return Object.entries(grouped).map(([description, groupItems]) => {
            const avgPrice = groupItems.reduce((sum, item) => sum + item.unitPrice, 0) / groupItems.length;
            const avgMargin = groupItems.reduce((sum, item) => sum + (item.margin || 0), 0) / groupItems.length;
            // Items are already ordered by date desc, so the first one is the last used
            const lastUsed = groupItems[0];

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
