'use server';

import { prisma } from '@/lib/prisma';
import { CostEstimateItem } from '@/types';
import { revalidatePath } from 'next/cache';

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

export async function deleteCostEstimate(id: number) {
    try {
        // First get the item to know the projectId for revalidation
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
