'use server';

import { prisma } from '@/lib/prisma';
import { Expense } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getExpenses(projectId: number) {
    try {
        const expenses = await prisma.expense.findMany({
            where: {
                projectId,
                isDeleted: 0,
            },
            orderBy: {
                date: 'desc',
            },
        });

        return expenses.map(e => ({
            ...e,
            netAmount: e.netAmount || undefined,
            taxRate: e.taxRate || undefined,
            orderId: e.orderId || undefined,
            deletedAt: e.deletedAt || undefined,
            type: e.type as 'Employee' | 'Purchase',
        }));
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
}

export async function createExpense(data: Expense) {
    try {
        const { id, ...rest } = data;
        const expense = await prisma.expense.create({
            data: {
                projectId: rest.projectId,
                title: rest.title,
                amount: rest.amount,
                netAmount: rest.netAmount,
                taxRate: rest.taxRate,
                type: rest.type,
                date: rest.date,
                orderId: rest.orderId,
                isDeleted: 0,
            },
        });
        revalidatePath(`/projects/${rest.projectId}`);
        return expense;
    } catch (error) {
        console.error('Error creating expense:', error);
        throw error;
    }
}

export async function updateExpense(id: number, data: Partial<Expense>) {
    try {
        const { id: _, ...rest } = data;
        const expense = await prisma.expense.update({
            where: { id },
            data: rest,
        });
        revalidatePath(`/projects/${expense.projectId}`);
        return expense;
    } catch (error) {
        console.error('Error updating expense:', error);
        throw error;
    }
}

export async function deleteExpense(id: number) {
    try {
        const expense = await prisma.expense.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date(),
            },
        });
        revalidatePath(`/projects/${expense.projectId}`);
    } catch (error) {
        console.error('Error deleting expense:', error);
        throw error;
    }
}
