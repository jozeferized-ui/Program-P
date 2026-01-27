'use server';

import { prisma } from '@/lib/prisma';

interface DateRange {
    from?: string;
    to?: string;
}

export async function getFinancialStats(dateRange?: DateRange) {
    try {
        const now = new Date();
        const fromDate = dateRange?.from ? new Date(dateRange.from) : new Date(now.getFullYear(), 0, 1); // Default: start of year
        const toDate = dateRange?.to ? new Date(dateRange.to) : now;

        // Fetch necessary data
        const projects = await prisma.project.findMany({
            where: { isDeleted: 0 },
            select: {
                id: true,
                status: true,
                totalValue: true,
                createdAt: true,
                endDate: true,
            }
        });

        const expenses = await prisma.expense.findMany({
            where: {
                isDeleted: 0,
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            select: {
                projectId: true,
                amount: true,
                type: true,
                date: true
            }
        });

        const allExpenses = await prisma.expense.findMany({
            where: { isDeleted: 0 },
            select: {
                projectId: true,
                amount: true,
                type: true,
                date: true
            }
        });

        const costEstimates = await prisma.costEstimateItem.findMany({
            select: {
                projectId: true,
                quantity: true,
                unitNetPrice: true,
                taxRate: true
            }
        });

        const _orders = await prisma.order.findMany({
            where: {
                isDeleted: 0,
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            select: {
                supplierId: true,
                amount: true,
                date: true
            }
        });

        const allOrders = await prisma.order.findMany({
            where: { isDeleted: 0 },
            select: {
                supplierId: true,
                amount: true
            }
        });

        const suppliers = await prisma.supplier.findMany({
            where: { isDeleted: 0 },
            select: {
                id: true,
                name: true
            }
        });

        // 1. Revenue (Przychody)
        const revenueCompleted = projects
            .filter(p => p.status === 'Completed')
            .reduce((sum, p) => sum + p.totalValue, 0);

        const revenueActive = projects
            .filter(p => p.status === 'Active')
            .reduce((sum, p) => sum + p.totalValue, 0);

        // Forecast includes Active, Completed, and To Quote projects (excludes On Hold)
        const forecastProjects = projects.filter(p => p.status !== 'On Hold');
        const forecastProjectIds = new Set(forecastProjects.map(p => p.id));

        const revenueForecast = forecastProjects
            .reduce((sum, p) => sum + p.totalValue, 0);

        // 2. Costs (Koszty)
        const expensesByProject = allExpenses.reduce((acc, exp) => {
            acc[exp.projectId] = (acc[exp.projectId] || 0) + exp.amount;
            return acc;
        }, {} as Record<number, number>);

        const costRealizedCompleted = projects
            .filter(p => p.status === 'Completed')
            .reduce((sum, p) => sum + (expensesByProject[p.id!] || 0), 0);

        const costRealizedActive = projects
            .filter(p => p.status === 'Active')
            .reduce((sum, p) => sum + (expensesByProject[p.id!] || 0), 0);

        const costRealizedTotal = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        const costInPeriod = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Estimated Costs - only for projects included in forecast
        const calculateGross = (net: number, tax: number) => net * (1 + tax / 100);
        const costEstimatedTotal = costEstimates
            .filter(item => forecastProjectIds.has(item.projectId))
            .reduce((sum, item) => sum + (item.quantity * calculateGross(item.unitNetPrice, item.taxRate)), 0);

        // 3. Profit (Zysk)
        const profitCompleted = revenueCompleted - costRealizedCompleted;
        const profitActive = revenueActive - costRealizedActive;

        // Forecast profit: forecast revenue minus estimated costs for forecast projects
        const profitForecast = revenueForecast - costEstimatedTotal;

        // 4. Top Supplier (all time)
        const supplierTurnover: Record<number, number> = {};
        allOrders.forEach(order => {
            if (order.supplierId) {
                supplierTurnover[order.supplierId] = (supplierTurnover[order.supplierId] || 0) + order.amount;
            }
        });

        let topSupplierId = -1;
        let maxTurnover = 0;

        for (const [id, amount] of Object.entries(supplierTurnover)) {
            if (amount > maxTurnover) {
                maxTurnover = amount;
                topSupplierId = parseInt(id);
            }
        }

        const topSupplierName = topSupplierId !== -1
            ? suppliers.find(s => s.id === topSupplierId)?.name || 'Nieznany'
            : 'Brak danych';

        // 5. Expenses by Category (all expenses for full picture)
        const expensesByCategory = allExpenses.reduce((acc, exp) => {
            const type = exp.type === 'Employee' ? 'Robocizna' : 'Materiały';
            acc[type] = (acc[type] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        const expenseCategoryData: { name: string; value: number }[] = Object.entries(expensesByCategory).map(([name, value]) => ({
            name,
            value: value as number
        }));

        // 6. Monthly Trend Data (last 12 months)
        const monthlyData: { month: string; revenue: number; costs: number; profit: number }[] = [];

        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthName = monthDate.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });

            // Revenue: projects completed in this month
            const monthRevenue = projects
                .filter(p => {
                    if (p.status !== 'Completed' || !p.endDate) return false;
                    const endDate = new Date(p.endDate);
                    return endDate >= monthDate && endDate <= monthEnd;
                })
                .reduce((sum, p) => sum + p.totalValue, 0);

            // Costs: expenses in this month
            const monthCosts = allExpenses
                .filter(exp => {
                    const expDate = new Date(exp.date);
                    return expDate >= monthDate && expDate <= monthEnd;
                })
                .reduce((sum, exp) => sum + exp.amount, 0);

            monthlyData.push({
                month: monthName,
                revenue: monthRevenue,
                costs: monthCosts,
                profit: monthRevenue - monthCosts
            });
        }

        // 7. KPIs
        const completedProjects = projects.filter(p => p.status === 'Completed');
        const avgProjectValue = completedProjects.length > 0
            ? completedProjects.reduce((sum, p) => sum + p.totalValue, 0) / completedProjects.length
            : 0;

        const marginPercent = revenueCompleted > 0
            ? ((profitCompleted / revenueCompleted) * 100)
            : 0;

        // 8. Top 5 Suppliers
        const topSuppliers = Object.entries(supplierTurnover)
            .map(([id, amount]) => ({
                id: parseInt(id),
                name: suppliers.find(s => s.id === parseInt(id))?.name || 'Nieznany',
                amount
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return {
            revenue: {
                completed: revenueCompleted,
                active: revenueActive,
                forecast: revenueForecast
            },
            costs: {
                realizedCompleted: costRealizedCompleted,
                realizedActive: costRealizedActive,
                realizedTotal: costRealizedTotal,
                estimatedTotal: costEstimatedTotal,
                inPeriod: costInPeriod
            },
            profit: {
                completed: profitCompleted,
                active: profitActive,
                forecast: profitForecast
            },
            topSupplier: {
                name: topSupplierName,
                amount: maxTurnover
            },
            expenseCategories: expenseCategoryData,
            monthlyTrend: monthlyData,
            kpis: {
                marginPercent,
                avgProjectValue,
                completedProjectsCount: completedProjects.length,
                activeProjectsCount: projects.filter(p => p.status === 'Active').length
            },
            topSuppliers
        };

    } catch (error) {
        console.error('Error calculating financial stats:', error);
        throw error;
    }
}

