/**
 * @file dashboard.ts
 * @description Dane statystyczne dla dashboardu głównego
 * 
 * Odpowiada za:
 * - Agregację danych z całej aplikacji
 * - Statystyki projektów, zadań, zamówień
 * - Alerty o wygasających narzędziach i uprawnieniach
 * 
 * @module actions/dashboard
 */
'use server';

import { prisma } from '@/lib/prisma';
import { ProjectStatus, TaskStatus } from '@/types';

/**
 * Pobiera wszystkie statystyki dla dashboardu
 * Wykonuje 10 równoległych zapytań do bazy danych
 * 
 * @returns Obiekt zawierający:
 *   - activeProjects: Liczba aktywnych projektów głównych
 *   - pendingTasks: 10 ostatnich nieukończonych zadań
 *   - pendingOrders: Zamówienia oczekujące i zamówione
 *   - recentProjects: Projekty nieukończone z podprojektami
 *   - completedProjects: 10 ostatnio ukończonych projektów
 *   - allProjects: Wszystkie projekty (dla mapy i timeline)
 *   - alerts: Alerty o wygasających narzędziach/uprawnieniach
 * 
 * @throws Error w przypadku błędu bazy danych
 */
export async function getDashboardStats() {
    try {
        const [
            activeProjectsCount,
            pendingTasks,
            pendingOrders,
            recentProjects,
            completedProjects,
            allProjects,
            expiredToolsCount,
            expiringToolsCount,
            expiredPermissionsCount,
            expiringPermissionsCount
        ] = await Promise.all([
            // 1. Liczba aktywnych projektów (bez podprojektów)
            prisma.project.count({
                where: {
                    status: 'Active',
                    parentProjectId: null,  // Tylko projekty główne
                    isDeleted: 0
                }
            }),

            // 2. Nieukończone zadania z aktywnych projektów (top 10)
            prisma.task.findMany({
                where: {
                    status: { not: 'Done' },
                    project: {
                        status: 'Active',
                        isDeleted: 0
                    },
                    isDeleted: 0
                },
                orderBy: [
                    { dueDate: 'asc' },     // Najpilniejsze pierwsze
                    { createdAt: 'desc' }
                ],
                take: 10,
                include: {
                    project: {
                        select: { name: true }
                    }
                }
            }),

            // 3. Zamówienia oczekujące/zamówione (nie z projektów wstrzymanych)
            prisma.order.findMany({
                where: {
                    status: { in: ['Pending', 'Ordered'] },
                    project: {
                        status: { not: 'On Hold' },
                        isDeleted: 0
                    },
                    isDeleted: 0
                },
                orderBy: { date: 'desc' },
                include: {
                    project: {
                        select: { name: true }
                    },
                    supplier: {
                        select: { name: true }
                    }
                }
            }),

            // 4. Projekty główne nieukończone (dla widoku listy)
            prisma.project.findMany({
                where: {
                    parentProjectId: null,
                    status: { not: 'Completed' },
                    isDeleted: 0
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    client: {
                        select: { name: true, color: true }
                    },
                    subProjects: {
                        where: { isDeleted: 0 },
                        select: {
                            id: true,
                            name: true,
                            status: true
                        }
                    }
                }
            }),

            // 5. Ukończone projekty (ostatnie 10)
            prisma.project.findMany({
                where: {
                    status: 'Completed',
                    parentProjectId: null,
                    isDeleted: 0
                },
                orderBy: [
                    { endDate: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 10,
                include: {
                    client: {
                        select: { name: true }
                    }
                }
            }),

            // 6. Wszystkie projekty (dla mapy i wykresu czasowego)
            prisma.project.findMany({
                where: {
                    isDeleted: 0
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    client: true,
                    suppliers: true,
                    employees: true,
                    subProjects: true
                }
            }),

            // 7. Narzędzia z wygasłym przeglądem
            (prisma as any).tool.count({
                where: {
                    isDeleted: 0,
                    inspectionExpiryDate: { lt: new Date() }
                }
            }),

            // 8. Narzędzia z wygasającym przeglądem (14 dni)
            (prisma as any).tool.count({
                where: {
                    isDeleted: 0,
                    inspectionExpiryDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                    }
                }
            }),

            // 9. Wygasłe uprawnienia pracowników
            (prisma as any).employeePermission.count({
                where: {
                    expiryDate: { lt: new Date() }
                }
            }),

            // 10. Wygasające uprawnienia (30 dni)
            (prisma as any).employeePermission.count({
                where: {
                    expiryDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        // Mapowanie i transformacja danych
        return {
            activeProjects: activeProjectsCount,

            // Zadania z nazwą projektu i parsowanymi polami JSON
            pendingTasks: pendingTasks.map((t: any) => ({
                ...t,
                projectName: t.project?.name || 'Nieznany projekt',
                status: t.status as TaskStatus,
                priority: t.priority as 'Low' | 'Medium' | 'High',
                description: t.description || undefined,
                dueDate: t.dueDate || undefined,
                subtasks: t.subtasks ? JSON.parse(t.subtasks) : undefined,
                checklist: t.checklist ? JSON.parse(t.checklist) : undefined,
                deletedAt: t.deletedAt || undefined,
            })),

            // Zamówienia z nazwami projektu i dostawcy
            pendingOrders: pendingOrders.map((o: any) => ({
                ...o,
                projectName: o.project?.name || 'Nieznany projekt',
                supplierName: o.supplier?.name || 'Brak dostawcy',
                status: o.status as 'Pending' | 'Ordered' | 'Delivered',
                taskId: o.taskId || undefined,
                supplierId: o.supplierId || undefined,
                netAmount: o.netAmount || undefined,
                taxRate: o.taxRate || undefined,
                quantity: o.quantity || undefined,
                unit: o.unit || undefined,
                notes: o.notes || undefined,
                url: o.url || undefined,
                deletedAt: o.deletedAt || undefined,
            })),

            // Aktywne projekty z podprojektami
            recentProjects: recentProjects.map((p: any) => ({
                ...p,
                clientName: p.client?.name || 'Nieznany',
                clientColor: p.client?.color || null,
                subprojectCount: p.subProjects.length,
                subprojectsPreview: p.subProjects.map((sp: any) => ({
                    ...sp,
                    status: sp.status as ProjectStatus
                })),
                status: p.status as ProjectStatus,
                parentProjectId: p.parentProjectId || undefined,
                description: p.description || undefined,
                startDate: p.startDate || undefined,
                endDate: p.endDate || undefined,
                quoteDueDate: p.quoteDueDate || undefined,
                quoteStatus: (p.quoteStatus as 'W trakcie' | 'Zaakceptowana' | 'Niezaakceptowana' | 'Do zmiany') || undefined,
                quotationTitle: p.quotationTitle || undefined,
                acceptedDate: p.acceptedDate || undefined,
                address: p.address || undefined,
                lat: p.lat || undefined,
                lng: p.lng || undefined,
                deletedAt: p.deletedAt || undefined,
            })),

            // Ukończone projekty
            completedProjects: completedProjects.map((p: any) => ({
                ...p,
                clientName: p.client?.name || 'Nieznany',
                status: p.status as ProjectStatus,
                parentProjectId: p.parentProjectId || undefined,
                description: p.description || undefined,
                startDate: p.startDate || undefined,
                endDate: p.endDate || undefined,
                quoteDueDate: p.quoteDueDate || undefined,
                quoteStatus: (p.quoteStatus as any) || undefined,
                quotationTitle: p.quotationTitle || undefined,
                acceptedDate: p.acceptedDate || undefined,
                address: p.address || undefined,
                lat: p.lat || undefined,
                lng: p.lng || undefined,
                deletedAt: p.deletedAt || undefined,
            })),

            // Wszystkie projekty dla mapy/timeline
            allProjects: allProjects.map((p: any) => ({
                ...p,
                status: p.status as ProjectStatus,
                parentProjectId: p.parentProjectId || undefined,
                description: p.description || undefined,
                startDate: p.startDate || undefined,
                endDate: p.endDate || undefined,
                quoteDueDate: p.quoteDueDate || undefined,
                quoteStatus: (p.quoteStatus as any) || undefined,
                quotationTitle: p.quotationTitle || undefined,
                acceptedDate: p.acceptedDate || undefined,
                address: p.address || undefined,
                lat: p.lat || undefined,
                lng: p.lng || undefined,
                deletedAt: p.deletedAt || undefined,
                supplierIds: (p.suppliers || []).map((s: any) => s.id),
                employeeIds: (p.employees || []).map((e: any) => e.id)
            })),

            // Alerty systemowe
            alerts: {
                expiredTools: expiredToolsCount,          // Wygasłe przeglądy narzędzi
                expiringTools: expiringToolsCount,        // Wygasające w 14 dni
                expiredPermissions: expiredPermissionsCount,  // Wygasłe uprawnienia
                expiringPermissions: expiringPermissionsCount, // Wygasające w 30 dni
                total: expiredToolsCount + expiringToolsCount + expiredPermissionsCount + expiringPermissionsCount
            }
        };

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
}
