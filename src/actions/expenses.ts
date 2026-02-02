/**
 * @file expenses.ts
 * @description Zarządzanie wydatkami projektów
 * 
 * Odpowiada za:
 * - CRUD wydatków (tworzenie, odczyt, aktualizacja, usuwanie)
 * - Rejestrację kosztów robocizny i materiałów
 * - Soft delete wydatków
 * 
 * @module actions/expenses
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Expense } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie wydatki dla danego projektu
 * @param projectId - ID projektu
 * @returns Tablica wydatków posortowana od najnowszych
 */
export async function getExpenses(projectId: number) {
    try {
        const expenses = await prisma.expense.findMany({
            where: {
                projectId,
                isDeleted: 0,  // Tylko nieusunięte wydatki
            },
            orderBy: {
                date: 'desc',  // Najnowsze na górze
            },
        });

        // Mapowanie typów i null na undefined
        return expenses.map(e => ({
            ...e,
            netAmount: e.netAmount || undefined,   // Kwota netto
            taxRate: e.taxRate || undefined,       // Stawka VAT
            orderId: e.orderId || undefined,       // Powiązane zamówienie
            deletedAt: e.deletedAt || undefined,
            type: e.type as 'Employee' | 'Purchase',  // Robocizna lub Zakupy
        }));
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
}

/**
 * Tworzy nowy wydatek
 * @param data - Dane wydatku:
 *   - title: Nazwa/opis wydatku
 *   - amount: Kwota brutto
 *   - netAmount: Kwota netto (opcjonalne)
 *   - taxRate: Stawka VAT (opcjonalne)
 *   - type: 'Employee' (robocizna) lub 'Purchase' (zakupy)
 *   - date: Data wydatku
 *   - orderId: Powiązane zamówienie (opcjonalne)
 * @returns Utworzony wydatek
 * @throws Error w przypadku błędu bazy danych
 */
export async function createExpense(data: Expense) {
    try {
        const { id: _id, ...rest } = data;
        const expense = await prisma.expense.create({
            data: {
                projectId: rest.projectId,
                title: rest.title,
                amount: rest.amount,       // Brutto
                netAmount: rest.netAmount, // Netto
                taxRate: rest.taxRate,     // VAT %
                type: rest.type,           // Employee/Purchase
                date: rest.date,
                orderId: rest.orderId,     // Opcjonalne powiązanie z zamówieniem
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

/**
 * Aktualizuje istniejący wydatek
 * @param id - ID wydatku
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowany wydatek
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateExpense(id: number, data: Partial<Expense>) {
    try {
        const { id: _unused, ...rest } = data;
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

/**
 * Usuwa wydatek (soft delete)
 * @param id - ID wydatku do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
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
