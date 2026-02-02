/**
 * @file clients.ts
 * @description Zarządzanie klientami i ich kategoriami
 * 
 * Odpowiada za:
 * - CRUD klientów (tworzenie, odczyt, aktualizacja, usuwanie)
 * - Zarządzanie kategoriami klientów
 * - Weryfikację czy klient ma aktywne projekty przed usunięciem
 * 
 * @module actions/clients
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Client } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera listę wszystkich aktywnych klientów
 * @returns Tablica klientów z kategoriami, posortowana alfabetycznie po nazwie
 */
export async function getClients() {
    try {
        const clients = await prisma.client.findMany({
            where: {
                isDeleted: 0,  // Tylko nieusunięci klienci
            },
            orderBy: {
                name: 'asc',  // Sortuj po nazwie
            },
            include: {
                category: true,  // Dołącz kategorię
            },
        });
        // Mapowanie null na undefined dla opcjonalnych pól
        return clients.map(c => ({
            ...c,
            email: c.email || undefined,
            phone: c.phone || undefined,
            notes: c.notes || undefined,
            categoryId: c.categoryId || undefined,
            deletedAt: c.deletedAt || undefined,
        }));
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
}

/**
 * Tworzy nowego klienta
 * @param data - Dane klienta (nazwa, email, telefon, notatki, kategoria)
 * @returns Utworzony rekord klienta
 * @throws Error w przypadku błędu bazy danych
 */
export async function createClient(data: Client) {
    try {
        const { id: _id, ...rest } = data;
        const client = await prisma.client.create({
            data: {
                name: rest.name,
                email: rest.email,
                phone: rest.phone,
                notes: rest.notes,
                categoryId: rest.categoryId,
                isDeleted: 0,
            },
        });
        revalidatePath('/clients');
        return client;
    } catch (error) {
        console.error('Error creating client:', error);
        throw error;
    }
}

/**
 * Aktualizuje dane klienta
 * @param id - ID klienta
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowany rekord klienta
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateClient(id: number, data: Partial<Client>) {
    try {
        const client = await prisma.client.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                notes: data.notes,
                categoryId: data.categoryId,
            },
        });
        revalidatePath('/clients');
        return client;
    } catch (error) {
        console.error('Error updating client:', error);
        throw error;
    }
}

/**
 * Usuwa klienta (soft delete)
 * Sprawdza czy klient nie ma aktywnych projektów przed usunięciem
 * @param id - ID klienta do usunięcia
 * @throws Error jeśli klient ma aktywne projekty lub błąd bazy danych
 */
export async function deleteClient(id: number) {
    try {
        // Sprawdź czy klient ma aktywne projekty
        const hasProjects = await prisma.project.count({
            where: { clientId: id, isDeleted: 0 }
        });

        if (hasProjects > 0) {
            throw new Error(`Nie można usunąć klienta - ma ${hasProjects} aktywnych projektów`);
        }

        // Soft delete
        await prisma.client.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date(),
            },
        });
        revalidatePath('/clients');
    } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
    }
}

/**
 * Pobiera wszystkie kategorie klientów
 * @returns Tablica kategorii klientów
 */
export async function getClientCategories() {
    try {
        return await prisma.clientCategory.findMany();
    } catch (error) {
        console.error('Error fetching client categories:', error);
        return [];
    }
}

/**
 * Tworzy nową kategorię klientów
 * @param name - Nazwa kategorii
 * @returns Utworzona kategoria
 * @throws Error w przypadku błędu bazy danych
 */
export async function createClientCategory(name: string) {
    try {
        const category = await prisma.clientCategory.create({
            data: { name },
        });
        return category;
    } catch (error) {
        console.error('Error creating client category:', error);
        throw error;
    }
}

/**
 * Sprawdza czy klient ma aktywne projekty
 * @param clientId - ID klienta
 * @returns true jeśli klient ma projekty, false w przeciwnym razie
 */
export async function checkClientHasProjects(clientId: number) {
    try {
        const count = await prisma.project.count({
            where: {
                clientId: clientId,
                isDeleted: 0,
            },
        });
        return count > 0;
    } catch (error) {
        console.error('Error checking client projects:', error);
        return false;
    }
}
