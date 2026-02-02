/**
 * @file finances.ts
 * @description Statystyki i raporty finansowe
 * 
 * Odpowiada za:
 * - Obliczanie przychodów (zrealizowane, aktywne, prognoza)
 * - Kalkulację kosztów i zysków
 * - Analizę wydatków wg kategorii
 * - Trendy miesięczne (ostatnie 12 miesięcy)
 * - Ranking dostawców wg obrotu
 * - KPI finansowe
 * 
 * @module actions/finances
 */
'use server';

import { prisma } from '@/lib/prisma';

/**
 * Zakres dat dla filtrowania danych finansowych
 */
interface DateRange {
    /** Data początkowa (ISO string) */
    from?: string;
    /** Data końcowa (ISO string) */
    to?: string;
}

/**
 * Pobiera kompleksowe statystyki finansowe
 * 
 * @param dateRange - Opcjonalny zakres dat (domyślnie: od początku roku)
 * @returns Obiekt ze statystykami:
 *   - revenue: Przychody (completed, active, forecast)
 *   - costs: Koszty (realized, estimated)
 *   - profit: Zyski (completed, active, forecast)
 *   - topSupplier: Dostawca z największym obrotem
 *   - expenseCategories: Wydatki wg kategorii
 *   - monthlyTrend: Dane miesięczne (ostatnie 12 miesięcy)
 *   - kpis: Wskaźniki (marża, średnia wartość projektu)
 *   - topSuppliers: Top 5 dostawców
 * @throws Error w przypadku błędu bazy danych
 */
export async function getFinancialStats(dateRange?: DateRange) {
    try {
        const now = new Date();
        // Domyślnie: od początku roku do dziś
        const fromDate = dateRange?.from ? new Date(dateRange.from) : new Date(now.getFullYear(), 0, 1);
        const toDate = dateRange?.to ? new Date(dateRange.to) : now;

        // Pobierz wszystkie potrzebne dane równolegle
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

        // Wydatki w okresie
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

        // Wszystkie wydatki (dla pełnego obrazu)
        const allExpenses = await prisma.expense.findMany({
            where: { isDeleted: 0 },
            select: {
                projectId: true,
                amount: true,
                type: true,
                date: true
            }
        });

        // Wyceny kosztów
        const costEstimates = await prisma.costEstimateItem.findMany({
            select: {
                projectId: true,
                quantity: true,
                unitNetPrice: true,
                taxRate: true
            }
        });

        // Zamówienia w okresie (nieużywane bezpośrednio, ale pobrane dla spójności)
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

        // Wszystkie zamówienia (dla rankingu dostawców)
        const allOrders = await prisma.order.findMany({
            where: { isDeleted: 0 },
            select: {
                supplierId: true,
                amount: true
            }
        });

        // Dostawcy
        const suppliers = await prisma.supplier.findMany({
            where: { isDeleted: 0 },
            select: {
                id: true,
                name: true
            }
        });

        // 1. Przychody (Revenue)
        const revenueCompleted = projects
            .filter(p => p.status === 'Completed')
            .reduce((sum, p) => sum + p.totalValue, 0);

        const revenueActive = projects
            .filter(p => p.status === 'Active')
            .reduce((sum, p) => sum + p.totalValue, 0);

        // Prognoza: wszystkie projekty oprócz wstrzymanych
        const forecastProjects = projects.filter(p => p.status !== 'On Hold');
        const forecastProjectIds = new Set(forecastProjects.map(p => p.id));

        const revenueForecast = forecastProjects
            .reduce((sum, p) => sum + p.totalValue, 0);

        // 2. Koszty (Costs)
        // Wydatki pogrupowane wg projektu
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

        // Szacowane koszty (z wycen, tylko dla projektów w prognozie)
        const calculateGross = (net: number, tax: number) => net * (1 + tax / 100);
        const costEstimatedTotal = costEstimates
            .filter(item => forecastProjectIds.has(item.projectId))
            .reduce((sum, item) => sum + (item.quantity * calculateGross(item.unitNetPrice, item.taxRate)), 0);

        // 3. Zysk (Profit)
        const profitCompleted = revenueCompleted - costRealizedCompleted;
        const profitActive = revenueActive - costRealizedActive;
        const profitForecast = revenueForecast - costEstimatedTotal;

        // 4. Top Dostawca (all time)
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

        // 5. Wydatki wg kategorii
        const expensesByCategory = allExpenses.reduce((acc, exp) => {
            const type = exp.type === 'Employee' ? 'Robocizna' : 'Materiały';
            acc[type] = (acc[type] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        const expenseCategoryData: { name: string; value: number }[] = Object.entries(expensesByCategory).map(([name, value]) => ({
            name,
            value: value as number
        }));

        // 6. Trend miesięczny (ostatnie 12 miesięcy)
        const monthlyData: { month: string; revenue: number; costs: number; profit: number }[] = [];

        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthName = monthDate.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });

            // Przychody: projekty ukończone w tym miesiącu
            const monthRevenue = projects
                .filter(p => {
                    if (p.status !== 'Completed' || !p.endDate) return false;
                    const endDate = new Date(p.endDate);
                    return endDate >= monthDate && endDate <= monthEnd;
                })
                .reduce((sum, p) => sum + p.totalValue, 0);

            // Koszty: wydatki w tym miesiącu
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

        // 7. KPI
        const completedProjects = projects.filter(p => p.status === 'Completed');
        const avgProjectValue = completedProjects.length > 0
            ? completedProjects.reduce((sum, p) => sum + p.totalValue, 0) / completedProjects.length
            : 0;

        const marginPercent = revenueCompleted > 0
            ? ((profitCompleted / revenueCompleted) * 100)
            : 0;

        // 8. Top 5 dostawców
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
                completed: revenueCompleted,     // Zrealizowane (ukończone projekty)
                active: revenueActive,            // Aktywne projekty
                forecast: revenueForecast         // Prognoza (bez wstrzymanych)
            },
            costs: {
                realizedCompleted: costRealizedCompleted,  // Koszty ukończonych
                realizedActive: costRealizedActive,        // Koszty aktywnych
                realizedTotal: costRealizedTotal,          // Wszystkie koszty
                estimatedTotal: costEstimatedTotal,        // Szacowane (z wycen)
                inPeriod: costInPeriod                     // W wybranym okresie
            },
            profit: {
                completed: profitCompleted,       // Zysk z ukończonych
                active: profitActive,             // Zysk z aktywnych (potencjalny)
                forecast: profitForecast          // Zysk prognozowany
            },
            topSupplier: {
                name: topSupplierName,
                amount: maxTurnover
            },
            expenseCategories: expenseCategoryData,
            monthlyTrend: monthlyData,
            kpis: {
                marginPercent,                    // Marża %
                avgProjectValue,                  // Średnia wartość projektu
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
