/**
 * @file suppliers.ts
 * @description Zarządzanie dostawcami i kategoriami dostawców
 * 
 * Odpowiada za:
 * - CRUD dostawców (tworzenie, odczyt, aktualizacja, usuwanie)
 * - Zarządzanie kategoriami dostawców
 * - Soft delete dostawców
 * 
 * @module actions/suppliers
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Supplier } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera listę wszystkich aktywnych dostawców
 * @returns Tablica dostawców z kategoriami, posortowana alfabetycznie
 */
export async function getSuppliers() {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: {
                isDeleted: 0,  // Tylko nieusunięci dostawcy
            },
            orderBy: {
                name: 'asc',  // Sortuj po nazwie
            },
            include: {
                category: true,  // Dołącz kategorię
            },
        });
        // Mapowanie null na undefined dla opcjonalnych pól
        return suppliers.map(s => ({
            ...s,
            contactPerson: s.contactPerson || undefined,
            email: s.email || undefined,
            phone: s.phone || undefined,
            address: s.address || undefined,
            website: s.website || undefined,
            notes: s.notes || undefined,
            categoryId: s.categoryId || undefined,
            deletedAt: s.deletedAt || undefined,
        }));
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return [];
    }
}

/**
 * Pobiera pojedynczego dostawcę po ID
 * @param id - ID dostawcy
 * @returns Dostawca lub null jeśli nie znaleziono/usunięty
 */
export async function getSupplierById(id: number) {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: { category: true },
        });
        // Zwróć null dla usuniętych dostawców
        if (!supplier || supplier.isDeleted === 1) return null;
        return {
            ...supplier,
            contactPerson: supplier.contactPerson || undefined,
            email: supplier.email || undefined,
            phone: supplier.phone || undefined,
            address: supplier.address || undefined,
            website: supplier.website || undefined,
            notes: supplier.notes || undefined,
            categoryId: supplier.categoryId || undefined,
            deletedAt: supplier.deletedAt || undefined,
        };
    } catch (error) {
        console.error('Error fetching supplier:', error);
        return null;
    }
}

/**
 * Tworzy nowego dostawcę
 * @param data - Dane dostawcy (nazwa, kontakt, adres, www, notatki, kategoria)
 * @returns Utworzony rekord dostawcy
 * @throws Error w przypadku błędu bazy danych
 */
export async function createSupplier(data: Supplier) {
    try {
        const { id: _id, ...rest } = data;
        const supplier = await prisma.supplier.create({
            data: {
                name: rest.name,
                contactPerson: rest.contactPerson,
                email: rest.email,
                phone: rest.phone,
                address: rest.address,
                website: rest.website,
                notes: rest.notes,
                categoryId: rest.categoryId,
                isDeleted: 0,
            },
        });
        revalidatePath('/suppliers');
        return supplier;
    } catch (error) {
        console.error('Error creating supplier:', error);
        throw error;
    }
}

/**
 * Aktualizuje dane dostawcy
 * @param id - ID dostawcy
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowany rekord dostawcy
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateSupplier(id: number, data: Partial<Supplier>) {
    try {
        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name: data.name,
                contactPerson: data.contactPerson,
                email: data.email,
                phone: data.phone,
                address: data.address,
                website: data.website,
                notes: data.notes,
                categoryId: data.categoryId,
            },
        });
        revalidatePath('/suppliers');
        return supplier;
    } catch (error) {
        console.error('Error updating supplier:', error);
        throw error;
    }
}

/**
 * Usuwa dostawcę (soft delete)
 * @param id - ID dostawcy do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteSupplier(id: number) {
    try {
        await prisma.supplier.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date(),  // Zapisz datę usunięcia
            },
        });
        revalidatePath('/suppliers');
    } catch (error) {
        console.error('Error deleting supplier:', error);
        throw error;
    }
}

/**
 * Pobiera wszystkie kategorie dostawców
 * @returns Tablica kategorii dostawców
 */
export async function getSupplierCategories() {
    try {
        return await prisma.supplierCategory.findMany();
    } catch (error) {
        console.error('Error fetching supplier categories:', error);
        return [];
    }
}

/**
 * Tworzy nową kategorię dostawców
 * @param name - Nazwa kategorii
 * @returns Utworzona kategoria
 * @throws Error w przypadku błędu bazy danych
 */
export async function createSupplierCategory(name: string) {
    try {
        return await prisma.supplierCategory.create({
            data: { name },
        });
    } catch (error) {
        console.error('Error creating supplier category:', error);
        throw error;
    }
}
