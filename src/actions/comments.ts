/**
 * @file comments.ts
 * @description Komentarze do projektów
 * 
 * Odpowiada za:
 * - Dodawanie komentarzy do projektów
 * - Pobieranie listy komentarzy
 * - Usuwanie komentarzy
 * 
 * @module actions/comments
 */
'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './users';
import { revalidatePath } from 'next/cache';

/**
 * Interfejs danych komentarza
 */
export interface CommentData {
    /** ID komentarza */
    id: number;
    /** ID projektu */
    projectId: number;
    /** ID użytkownika (może być null dla anonimowych) */
    userId: number | null;
    /** Imię i nazwisko autora */
    author: string;
    /** Treść komentarza */
    content: string;
    /** Data utworzenia */
    createdAt: Date;
}

/**
 * Pobiera wszystkie komentarze dla projektu
 * @param projectId - ID projektu
 * @returns Tablica komentarzy posortowana od najnowszych
 */
export async function getProjectComments(projectId: number): Promise<CommentData[]> {
    const comments = await prisma.comment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
    });
    return comments;
}

/**
 * Dodaje nowy komentarz do projektu
 * @param projectId - ID projektu
 * @param content - Treść komentarza
 * @returns Obiekt z success, error (opcjonalne), comment (opcjonalne)
 */
export async function addComment(
    projectId: number,
    content: string
): Promise<{ success: boolean; error?: string; comment?: CommentData }> {
    try {
        // Pobierz aktualnego użytkownika dla autora
        const user = await getCurrentUser();
        const author = user ? `${user.firstName} ${user.lastName}` : 'Anonim';

        const comment = await prisma.comment.create({
            data: {
                projectId,
                userId: user?.id || null,
                author,
                content,
            },
        });

        revalidatePath(`/projects/${projectId}`);

        return { success: true, comment };
    } catch (error) {
        console.error('Add comment error:', error);
        return { success: false, error: 'Błąd dodawania komentarza' };
    }
}

/**
 * Usuwa komentarz (hard delete)
 * @param id - ID komentarza do usunięcia
 * @returns Obiekt z success i opcjonalnie error
 */
export async function deleteComment(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        const comment = await prisma.comment.findUnique({ where: { id } });
        if (!comment) {
            return { success: false, error: 'Komentarz nie istnieje' };
        }

        await prisma.comment.delete({ where: { id } });
        revalidatePath(`/projects/${comment.projectId}`);

        return { success: true };
    } catch (error) {
        console.error('Delete comment error:', error);
        return { success: false, error: 'Błąd usuwania komentarza' };
    }
}
