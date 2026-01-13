'use server';

import { prisma } from '@/lib/prisma';
import { ProjectStatus, TaskStatus } from '@/types';

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
            // 1. Active Projects Count (excluding subprojects)
            prisma.project.count({
                where: {
                    status: 'Active',
                    parentProjectId: null,
                    isDeleted: 0
                }
            }),

            // 2. Pending Tasks (from active projects, not done, sorted by due date/created at)
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
                    { dueDate: 'asc' },
                    { createdAt: 'desc' }
                ],
                take: 10,
                include: {
                    project: {
                        select: { name: true }
                    }
                }
            }),

            // 3. Pending Orders (status Pending, from non-hold projects)
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

            // 4. Recent Projects (main projects, not completed)
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

            // 5. Completed Projects (recent 10)
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

            // 6. All Projects (for timeline and map)
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

            // 7. Expired Tools
            (prisma as any).tool.count({
                where: {
                    isDeleted: 0,
                    inspectionExpiryDate: { lt: new Date() }
                }
            }),

            // 8. Expiring Tools (next 14 days)
            (prisma as any).tool.count({
                where: {
                    isDeleted: 0,
                    inspectionExpiryDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                    }
                }
            }),

            // 9. Expired Permissions
            (prisma as any).employeePermission.count({
                where: {
                    expiryDate: { lt: new Date() }
                }
            }),

            // 10. Expiring Permissions (next 30 days)
            (prisma as any).employeePermission.count({
                where: {
                    expiryDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        return {
            activeProjects: activeProjectsCount,
            pendingTasks: pendingTasks.map((t: any) => ({
                ...t,
                projectName: t.project?.name || 'Nieznany projekt',
                status: t.status as TaskStatus,
                priority: t.priority as 'Low' | 'Medium' | 'High', // Cast to Priority type
                description: t.description || undefined,
                dueDate: t.dueDate || undefined,
                subtasks: t.subtasks ? JSON.parse(t.subtasks) : undefined,
                checklist: t.checklist ? JSON.parse(t.checklist) : undefined,
                deletedAt: t.deletedAt || undefined,
                // Ensure dates are passed as Date objects (Prisma does this, but good to be explicit if needed)
            })),
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
            alerts: {
                expiredTools: expiredToolsCount,
                expiringTools: expiringToolsCount,
                expiredPermissions: expiredPermissionsCount,
                expiringPermissions: expiringPermissionsCount,
                total: expiredToolsCount + expiringToolsCount + expiredPermissionsCount + expiringPermissionsCount
            }
        };

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
}
