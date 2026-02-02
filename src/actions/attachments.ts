/**
 * @file attachments.ts
 * @description Zarządzanie załącznikami projektów
 * 
 * Odpowiada za:
 * - Dodawanie załączników do projektów
 * - Pobieranie listy załączników
 * - Usuwanie załączników
 * 
 * @module actions/attachments
 */
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './users';
import { revalidatePath } from 'next/cache';

/**
 * Interfejs danych załącznika
 */
export interface AttachmentData {
    /** ID załącznika */
    id: number;
    /** ID projektu */
    projectId: number;
    /** Nazwa pliku */
    fileName: string;
    /** URL do pliku (Firebase Storage) */
    fileUrl: string;
    /** Rozmiar pliku w bajtach */
    fileSize: number;
    /** Typ MIME pliku */
    fileType: string;
    /** Kto dodał załącznik */
    uploadedBy: string | null;
    /** Data utworzenia */
    createdAt: Date;
}

/**
 * Pobiera wszystkie załączniki dla projektu
 * @param projectId - ID projektu
 * @returns Tablica załączników posortowana od najnowszych
 */
export async function getProjectAttachments(projectId: number): Promise<AttachmentData[]> {
    const attachments = await prisma.attachment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
    });
    return attachments;
}

/**
 * Dodaje nowy załącznik do projektu
 * @param projectId - ID projektu
 * @param data - Dane załącznika:
 *   - fileName: Nazwa pliku
 *   - fileUrl: URL do pliku
 *   - fileSize: Rozmiar w bajtach
 *   - fileType: Typ MIME
 * @returns Obiekt z success, error (opcjonalne), attachment (opcjonalne)
 */
export async function addAttachment(
    projectId: number,
    data: {
        fileName: string;
        fileUrl: string;
        fileSize: number;
        fileType: string;
    }
): Promise<{ success: boolean; error?: string; attachment?: AttachmentData }> {
    try {
        // Pobierz aktualnego użytkownika dla pola uploadedBy
        const user = await getCurrentUser();

        const attachment = await prisma.attachment.create({
            data: {
                projectId,
                fileName: data.fileName,
                fileUrl: data.fileUrl,
                fileSize: data.fileSize,
                fileType: data.fileType,
                uploadedBy: user ? `${user.firstName} ${user.lastName}` : null,
            },
        });

        revalidatePath(`/projects/${projectId}`);

        return { success: true, attachment };
    } catch (error) {
        console.error('Add attachment error:', error);
        return { success: false, error: 'Błąd dodawania załącznika' };
    }
}

/**
 * Usuwa załącznik (hard delete)
 * @param id - ID załącznika do usunięcia
 * @returns Obiekt z success i opcjonalnie error
 */
export async function deleteAttachment(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        const attachment = await prisma.attachment.findUnique({ where: { id } });
        if (!attachment) {
            return { success: false, error: 'Załącznik nie istnieje' };
        }

        await prisma.attachment.delete({ where: { id } });
        revalidatePath(`/projects/${attachment.projectId}`);

        return { success: true };
    } catch (error) {
        console.error('Delete attachment error:', error);
        return { success: false, error: 'Błąd usuwania załącznika' };
    }
}
