/**
 * @file resources.ts
 * @description Zarządzanie zasobami/plikami projektów
 * 
 * Odpowiada za:
 * - Pobieranie zasobów projektu (pliki, obrazy, linki)
 * - Upload plików do projektu (przez FormData)
 * - Soft delete zasobów
 * 
 * @module actions/resources
 */
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie zasoby dla projektu
 * Zwraca pliki jako base64 zamiast surowych buforów
 * 
 * @param projectId - ID projektu
 * @returns Tablica zasobów z contentBase64 zamiast contentBlob
 */
export async function getResources(projectId: number) {
    try {
        const resources = await prisma.resource.findMany({
            where: {
                projectId,
                isDeleted: 0,
            },
            orderBy: {
                createdAt: 'desc',  // Najnowsze na górze
            },
        });

        // Konwersja buforów na base64 dla frontendu
        return resources.map(r => ({
            ...r,
            contentBlob: undefined,  // Nie wysyłaj surowego bufora
            contentBase64: r.contentBlob ? Buffer.from(r.contentBlob).toString('base64') : undefined,
        }));
    } catch (error) {
        console.error('Error fetching resources:', error);
        return [];
    }
}

/**
 * Tworzy nowy zasób (plik, obraz lub link)
 * Przyjmuje FormData dla obsługi uploadów plików
 * 
 * @param formData - Dane formularza:
 *   - projectId: ID projektu
 *   - name: Nazwa zasobu
 *   - type: 'File', 'Image', lub 'Link'
 *   - folder: Folder organizacyjny
 *   - contentUrl: URL (dla typu Link)
 *   - file: Plik (dla typu File/Image)
 * @throws Error w przypadku błędu bazy danych
 */
export async function createResource(formData: FormData) {
    try {
        const projectId = parseInt(formData.get('projectId') as string);
        const name = formData.get('name') as string;
        const type = formData.get('type') as string;
        const folder = formData.get('folder') as string;
        const contentUrl = formData.get('contentUrl') as string;
        const file = formData.get('file') as File | null;

        // Konwersja pliku na bufor dla zapisu w bazie
        let contentBlob: Buffer | undefined;
        if (file && (type === 'File' || type === 'Image')) {
            const arrayBuffer = await file.arrayBuffer();
            contentBlob = Buffer.from(arrayBuffer);
        }

        await prisma.resource.create({
            data: {
                projectId,
                name,
                type,
                folder,
                contentUrl: type === 'Link' ? contentUrl : undefined,
                contentBlob: contentBlob as any,  // Prisma Bytes type
            },
        });
        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error('Error creating resource:', error);
        throw error;
    }
}

/**
 * Usuwa zasób (soft delete)
 * @param id - ID zasobu do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteResource(id: number) {
    try {
        const resource = await prisma.resource.findUnique({
            where: { id },
        });

        if (resource) {
            await prisma.resource.update({
                where: { id },
                data: {
                    isDeleted: 1,
                    deletedAt: new Date(),
                },
            });
            revalidatePath(`/projects/${resource.projectId}`);
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        throw error;
    }
}
