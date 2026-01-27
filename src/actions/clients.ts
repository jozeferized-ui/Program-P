'use server';

import { prisma } from '@/lib/prisma';
import { Client } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getClients() {
    try {
        const clients = await prisma.client.findMany({
            where: {
                isDeleted: 0,
            },
            orderBy: {
                name: 'asc',
            },
            include: {
                category: true,
            },
        });
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

export async function deleteClient(id: number) {
    try {
        // Check if client has active projects
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

export async function getClientCategories() {
    try {
        return await prisma.clientCategory.findMany();
    } catch (error) {
        console.error('Error fetching client categories:', error);
        return [];
    }
}

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
