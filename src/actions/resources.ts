'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getResources(projectId: number) {
    try {
        const resources = await prisma.resource.findMany({
            where: {
                projectId,
                isDeleted: 0,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return resources.map(r => ({
            ...r,
            contentBlob: undefined, // Do not send raw buffer to client
            contentBase64: r.contentBlob ? Buffer.from(r.contentBlob).toString('base64') : undefined,
        }));
    } catch (error) {
        console.error('Error fetching resources:', error);
        return [];
    }
}

export async function createResource(formData: FormData) {
    try {
        const projectId = parseInt(formData.get('projectId') as string);
        const name = formData.get('name') as string;
        const type = formData.get('type') as string;
        const folder = formData.get('folder') as string;
        const contentUrl = formData.get('contentUrl') as string;
        const file = formData.get('file') as File | null;

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
                contentBlob: contentBlob as any,
            },
        });
        revalidatePath(`/projects/${projectId}`);
    } catch (error) {
        console.error('Error creating resource:', error);
        throw error;
    }
}

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
