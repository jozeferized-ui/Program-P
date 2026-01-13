'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './users';
import { revalidatePath } from 'next/cache';

export interface AttachmentData {
    id: number;
    projectId: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedBy: string | null;
    createdAt: Date;
}

// Get attachments for a project
export async function getProjectAttachments(projectId: number): Promise<AttachmentData[]> {
    const attachments = await prisma.attachment.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
    });
    return attachments;
}

// Add an attachment to a project
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

// Delete an attachment
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
