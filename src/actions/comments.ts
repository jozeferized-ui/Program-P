'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './users';
import { revalidatePath } from 'next/cache';

export interface CommentData {
    id: number;
    projectId: number;
    userId: number | null;
    author: string;
    content: string;
    createdAt: Date;
}

// Get comments for a project
export async function getProjectComments(projectId: number): Promise<CommentData[]> {
    const comments = await prisma.comment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
    });
    return comments;
}

// Add a comment to a project
export async function addComment(
    projectId: number,
    content: string
): Promise<{ success: boolean; error?: string; comment?: CommentData }> {
    try {
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

// Delete a comment
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
