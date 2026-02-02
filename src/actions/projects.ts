/**
 * @file projects.ts
 * @description CRUD projekty i podprojekty
 * 
 * Odpowiada za:
 * - Pobieranie projektów z relacjami (klient, dostawcy, pracownicy, podprojekty)
 * - Tworzenie, aktualizacja, soft delete projektów
 * - Mapowanie typów Prisma na interfejsy aplikacji
 * 
 * @module actions/projects
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Project, ProjectStatus, QuoteStatus } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera wszystkie aktywne projekty z pełnymi relacjami
 * Mapuje dane Prisma na interfejs Project
 * 
 * @returns Tablica projektów posortowana od najnowszych
 */
export async function getProjects() {
    try {
        const projects = await prisma.project.findMany({
            where: {
                isDeleted: 0,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                client: true,                    // Klient projektu
                suppliers: true,                 // Powiązani dostawcy
                employees: true,                 // Przypisani pracownicy
                subProjects: {                   // Podprojekty
                    where: { isDeleted: 0 },
                    include: {
                        client: true,
                    }
                },
            },
        });

        // Mapowanie wyników Prisma na interfejs Project
        return projects.map(p => ({
            ...p,
            description: p.description || undefined,
            startDate: p.startDate || undefined,
            endDate: p.endDate || undefined,
            quoteDueDate: p.quoteDueDate || undefined,
            quoteStatus: (p.quoteStatus as QuoteStatus) || undefined,
            quotationTitle: p.quotationTitle || undefined,
            acceptedDate: p.acceptedDate || undefined,
            address: p.address || undefined,
            lat: p.lat || undefined,
            lng: p.lng || undefined,
            deletedAt: p.deletedAt || undefined,
            parentProjectId: p.parentProjectId || undefined,
            colorMarker: p.colorMarker || undefined,
            status: p.status as ProjectStatus,
            supplierIds: p.suppliers.map(s => s.id),
            employeeIds: p.employees.map(e => e.id),
            client: {
                ...p.client,
                email: p.client.email || undefined,
                phone: p.client.phone || undefined,
                notes: p.client.notes || undefined,
                categoryId: p.client.categoryId || undefined,
                deletedAt: p.client.deletedAt || undefined,
            },
            subProjects: p.subProjects.map(sp => ({
                ...sp,
                description: sp.description || undefined,
                startDate: sp.startDate || undefined,
                endDate: sp.endDate || undefined,
                quoteDueDate: sp.quoteDueDate || undefined,
                quoteStatus: (sp.quoteStatus as QuoteStatus) || undefined,
                quotationTitle: sp.quotationTitle || undefined,
                acceptedDate: sp.acceptedDate || undefined,
                address: sp.address || undefined,
                lat: sp.lat || undefined,
                lng: sp.lng || undefined,
                deletedAt: sp.deletedAt || undefined,
                parentProjectId: sp.parentProjectId || undefined,
                status: sp.status as ProjectStatus,
            }))
        }));
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

/**
 * Pobiera pojedynczy projekt po ID z pełnymi relacjami
 * Wyklucza projekty oznaczone jako usunięte
 * 
 * @param id - ID projektu
 * @returns Projekt z relacjami lub null jeśli nie znaleziono
 */
export async function getProject(id: number) {
    try {
        const project = await prisma.project.findFirst({
            where: {
                id,
                isDeleted: 0  // Tylko nieusunięte
            },
            include: {
                client: true,
                suppliers: true,
                employees: true,
                subProjects: true,
                parentProject: true,  // Projekt nadrzędny (jeśli to podprojekt)
            },
        });

        if (!project) return null;

        // Mapowanie na interfejs z pełnymi danymi relacji
        return {
            ...project,
            description: project.description || undefined,
            startDate: project.startDate || undefined,
            endDate: project.endDate || undefined,
            quoteDueDate: project.quoteDueDate || undefined,
            quoteStatus: (project.quoteStatus as QuoteStatus) || undefined,
            quotationTitle: project.quotationTitle || undefined,
            acceptedDate: project.acceptedDate || undefined,
            address: project.address || undefined,
            lat: project.lat || undefined,
            lng: project.lng || undefined,
            deletedAt: project.deletedAt || undefined,
            parentProjectId: project.parentProjectId || undefined,
            colorMarker: project.colorMarker || undefined,
            status: project.status as ProjectStatus,
            supplierIds: project.suppliers.map(s => s.id),
            employeeIds: project.employees.map(e => e.id),
            suppliers: project.suppliers.map(s => ({
                ...s,
                contactPerson: s.contactPerson || undefined,
                email: s.email || undefined,
                phone: s.phone || undefined,
                address: s.address || undefined,
                website: s.website || undefined,
                notes: s.notes || undefined,
                categoryId: s.categoryId || undefined,
                deletedAt: s.deletedAt || undefined,
            })),
            employees: project.employees.map(e => ({
                ...e,
                status: e.status as 'Active' | 'Inactive',
                isDeleted: e.isDeleted || undefined,
            })),
            client: {
                ...project.client,
                email: project.client.email || undefined,
                phone: project.client.phone || undefined,
                notes: project.client.notes || undefined,
                categoryId: project.client.categoryId || undefined,
                deletedAt: project.client.deletedAt || undefined,
            },
            subProjects: project.subProjects.map(sp => ({
                ...sp,
                description: sp.description || undefined,
                startDate: sp.startDate || undefined,
                endDate: sp.endDate || undefined,
                quoteDueDate: sp.quoteDueDate || undefined,
                quoteStatus: (sp.quoteStatus as QuoteStatus) || undefined,
                quotationTitle: sp.quotationTitle || undefined,
                acceptedDate: sp.acceptedDate || undefined,
                address: sp.address || undefined,
                lat: sp.lat || undefined,
                lng: sp.lng || undefined,
                deletedAt: sp.deletedAt || undefined,
                parentProjectId: sp.parentProjectId || undefined,
                status: sp.status as ProjectStatus,
            })),
            parentProject: project.parentProject ? {
                ...project.parentProject,
                description: project.parentProject.description || undefined,
                startDate: project.parentProject.startDate || undefined,
                endDate: project.parentProject.endDate || undefined,
                quoteDueDate: project.parentProject.quoteDueDate || undefined,
                quoteStatus: (project.parentProject.quoteStatus as QuoteStatus) || undefined,
                quotationTitle: project.parentProject.quotationTitle || undefined,
                acceptedDate: project.parentProject.acceptedDate || undefined,
                address: project.parentProject.address || undefined,
                lat: project.parentProject.lat || undefined,
                lng: project.parentProject.lng || undefined,
                deletedAt: project.parentProject.deletedAt || undefined,
                parentProjectId: project.parentProject.parentProjectId || undefined,
                status: project.parentProject.status as ProjectStatus,
            } : undefined
        };
    } catch (error) {
        console.error('Error fetching project:', error);
        return null;
    }
}

/**
 * Tworzy nowy projekt
 * Obsługuje powiązania z dostawcami i pracownikami
 * 
 * @param data - Dane projektu z supplierIds i employeeIds
 * @returns Utworzony projekt
 * @throws Error w przypadku błędu bazy danych
 */
export async function createProject(data: Project) {
    try {
        const { id: _id, supplierIds, employeeIds, ...rest } = data;

        const project = await prisma.project.create({
            data: {
                clientId: rest.clientId,
                parentProjectId: rest.parentProjectId,
                name: rest.name,
                description: rest.description,
                status: rest.status,
                startDate: rest.startDate,
                endDate: rest.endDate,
                totalValue: rest.totalValue,
                quoteDueDate: rest.quoteDueDate,
                quoteStatus: rest.quoteStatus,
                quotationTitle: rest.quotationTitle,
                acceptedDate: rest.acceptedDate,
                address: rest.address,
                lat: rest.lat,
                lng: rest.lng,
                colorMarker: rest.colorMarker,
                isDeleted: 0,
                // Powiązania many-to-many
                suppliers: supplierIds ? {
                    connect: supplierIds.map(sid => ({ id: sid }))
                } : undefined,
                employees: employeeIds ? {
                    connect: employeeIds.map(eid => ({ id: eid }))
                } : undefined,
            },
        });
        revalidatePath('/projects');
        return project;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
}

/**
 * Aktualizuje projekt
 * Używa 'set' dla relacji many-to-many (zastępuje wszystkie powiązania)
 * 
 * @param id - ID projektu
 * @param data - Częściowe dane do aktualizacji
 * @returns Zaktualizowany projekt
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateProject(id: number, data: Partial<Project>) {
    try {
        const { supplierIds, employeeIds, ...rest } = data;

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...rest,
                // Użyj 'set' by zastąpić wszystkie powiązania
                suppliers: supplierIds ? {
                    set: supplierIds.map(sid => ({ id: sid }))
                } : undefined,
                employees: employeeIds ? {
                    set: employeeIds.map(eid => ({ id: eid }))
                } : undefined,
            },
        });
        revalidatePath('/');           // Dashboard
        revalidatePath('/projects');
        revalidatePath(`/projects/${id}`);
        return project;
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
}

/**
 * Usuwa projekt (soft delete)
 * @param id - ID projektu do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteProject(id: number) {
    try {
        await prisma.project.update({
            where: { id },
            data: {
                isDeleted: 1,
                deletedAt: new Date(),
            },
        });
        revalidatePath('/projects');
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
}
