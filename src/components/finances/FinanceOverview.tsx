'use client';

import { Expense, CostEstimateItem } from '@/types';
import { AddExpenseDialog } from '@/components/finances/AddExpenseDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';

interface FinanceOverviewProps {
    projectId: number;
    projectValue: number;
    expenses: Expense[];
    costEstimates: CostEstimateItem[];
}

export function FinanceOverview({ projectId, projectValue, expenses, costEstimates }: FinanceOverviewProps) {


    // Realized Costs (Expenses) - what has been spent
    const totalExpensesNet = expenses?.reduce((sum, expense) => sum + (expense.netAmount || expense.amount), 0) || 0;

    // Estimated Costs (Planning) - planned costs from cost estimation
    const totalEstimatedNet = costEstimates?.reduce((sum, item) => sum + (item.quantity * item.unitNetPrice), 0) || 0;

    // Simple calculations
    const revenue = projectValue;  // Przychód (Revenue)
    const cost = totalExpensesNet + totalEstimatedNet;  // Koszt (wydane + wycena)
    const profit = revenue - cost;  // Zysk (Profit)
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Combine for Table
    const unifiedItems = [
        ...(costEstimates?.map(c => ({
            id: `est-${c.id}`,
            title: `${c.description} (${c.quantity} ${c.unit})`,
            type: 'Estimate',
            date: null,
            netAmount: c.quantity * c.unitNetPrice,
            taxRate: c.taxRate,
            amount: c.quantity * (c.unitNetPrice * (1 + c.taxRate / 100)),
            isEstimate: true
        })) || []),
        ...(expenses?.map(e => ({
            id: `exp-${e.id}`,
            title: e.title,
            type: e.type,
            date: e.date,
            netAmount: e.netAmount || e.amount,
            taxRate: e.taxRate || 0,
            amount: e.amount,
            isEstimate: false
        })) || [])
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Przychód</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {revenue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} <span className="text-sm font-normal text-muted-foreground">netto</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Wartość Projektu
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Koszt</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {cost.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} <span className="text-sm font-normal text-muted-foreground">netto</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Wydane: {totalExpensesNet.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} + Wycena: {totalEstimatedNet.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Zysk</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {profit.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} <span className="text-sm font-normal text-muted-foreground">netto</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Marża: {profitMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Historia Wydatków i Estymacji</h2>
                <AddExpenseDialog projectId={projectId} />
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nazwa</TableHead>
                            <TableHead>Typ</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Netto</TableHead>
                            <TableHead className="text-right">VAT</TableHead>
                            <TableHead className="text-right">Brutto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {unifiedItems.map((item) => (
                            <TableRow key={item.id} className={item.isEstimate ? "bg-orange-50/50 dark:bg-orange-900/10" : ""}>
                                <TableCell className="font-medium">
                                    {item.title}
                                    {item.isEstimate && <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">(Plan)</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={item.isEstimate ? "border-orange-200 text-orange-700" : ""}>
                                        {item.type === 'Employee' ? 'Pracownik' :
                                            item.type === 'Purchase' ? 'Zakupy' : 'Wycena'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {item.date ? format(item.date, 'd MMM yyyy', { locale: pl }) : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {item.netAmount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} <span className="text-[10px] text-muted-foreground">netto</span>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">
                                    {item.taxRate ? `${item.taxRate}%` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                    {item.amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })} <span className="text-[10px] font-normal text-muted-foreground">brutto</span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {unifiedItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Brak zarejestrowanych kosztów.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
