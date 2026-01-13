'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Area, AreaChart
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Percent, Building2, BarChart3 } from 'lucide-react';

interface FinancialData {
    revenue: {
        completed: number;
        active: number;
        forecast: number;
    };
    costs: {
        realizedCompleted: number;
        realizedActive: number;
        realizedTotal: number;
        estimatedTotal: number;
        inPeriod: number;
    };
    profit: {
        completed: number;
        active: number;
        forecast: number;
    };
    topSupplier: {
        name: string;
        amount: number;
    };
    expenseCategories: { name: string; value: number }[];
    monthlyTrend: { month: string; revenue: number; costs: number; profit: number }[];
    kpis: {
        marginPercent: number;
        avgProjectValue: number;
        completedProjectsCount: number;
        activeProjectsCount: number;
    };
    topSuppliers: { id: number; name: string; amount: number }[];
}

interface FinancesClientProps {
    data: FinancialData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function FinancesClient({ data }: FinancesClientProps) {
    const [activeTab, setActiveTab] = useState('overview');

    const formatCurrency = (value: number) =>
        value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

    const formatShortCurrency = (value: number) =>
        `${(value / 1000).toFixed(0)}k PLN`;

    const revenueData = [
        { name: 'Zakończone', value: data.revenue.completed },
        { name: 'W Trakcie', value: data.revenue.active },
        { name: 'Prognoza', value: data.revenue.forecast },
    ];

    const costData = [
        { name: 'Zakończone', realized: data.costs.realizedCompleted, estimated: 0 },
        { name: 'W Trakcie', realized: data.costs.realizedActive, estimated: 0 },
        { name: 'Razem', realized: data.costs.realizedTotal, estimated: data.costs.estimatedTotal },
    ];

    const profitData = [
        { name: 'Zakończone', value: data.profit.completed },
        { name: 'W Trakcie', value: data.profit.active },
        { name: 'Prognozowane', value: data.profit.forecast },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 mb-4">
                <h1 className="text-2xl font-bold">Finanse</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-3 h-10 flex-shrink-0">
                    <TabsTrigger value="overview" className="text-sm font-semibold">Przegląd</TabsTrigger>
                    <TabsTrigger value="trends" className="text-sm font-semibold">Trendy</TabsTrigger>
                    <TabsTrigger value="details" className="text-sm font-semibold">Szczegóły</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 overflow-auto mt-4 space-y-4">
                    {/* KPI Cards */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Przychód (Zrealizowany)</CardTitle>
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                    {formatCurrency(data.revenue.completed)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Z {data.kpis.completedProjectsCount} zakończonych projektów
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Prognoza Przychodu</CardTitle>
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                    {formatCurrency(data.revenue.forecast)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {data.kpis.activeProjectsCount} aktywnych projektów
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Koszty (Poniesione)</CardTitle>
                                <Wallet className="h-5 w-5 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                                    {formatCurrency(data.costs.realizedTotal)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Planowane: {formatCurrency(data.costs.estimatedTotal)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={`bg-gradient-to-br ${data.profit.completed >= 0
                            ? 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : 'from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Zysk (Zrealizowany)</CardTitle>
                                {data.profit.completed >= 0 ? (
                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                ) : (
                                    <TrendingDown className="h-5 w-5 text-orange-600" />
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${data.profit.completed >= 0
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-orange-700 dark:text-orange-400'
                                    }`}>
                                    {formatCurrency(data.profit.completed)}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                        <Percent className="h-3 w-3 mr-1" />
                                        {data.kpis.marginPercent.toFixed(1)}% marży
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional KPIs */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Średnia wartość projektu</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">
                                    {formatCurrency(data.kpis.avgProjectValue)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Top Dostawca</CardTitle>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold truncate">{data.topSupplier.name}</div>
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(data.topSupplier.amount)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Projekty zakończone</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.kpis.completedProjectsCount}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Projekty aktywne</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.kpis.activeProjectsCount}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Przychody</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={revenueData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" name="Przychód" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Profit Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Zysk</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={profitData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" name="Zysk" radius={[4, 4, 0, 0]}>
                                            {profitData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#dc2626' : '#2563eb'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Trends Tab */}
                <TabsContent value="trends" className="flex-1 overflow-auto mt-4 space-y-4">
                    {/* Monthly Trend Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Trend miesięczny (12 miesięcy)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.monthlyTrend}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        name="Przychód"
                                        stroke="#16a34a"
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="costs"
                                        name="Koszty"
                                        stroke="#dc2626"
                                        fillOpacity={1}
                                        fill="url(#colorCosts)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Profit Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Trend zysku</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.monthlyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="profit"
                                        name="Zysk"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        dot={{ fill: '#2563eb', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="flex-1 overflow-auto mt-4 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Suppliers */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top 5 Dostawców</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.topSuppliers.length > 0 ? (
                                        data.topSuppliers.map((supplier, index) => (
                                            <div key={supplier.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                                        index === 1 ? 'bg-gray-400' :
                                                            index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <span className="font-medium">{supplier.name}</span>
                                                </div>
                                                <span className="font-bold">{formatCurrency(supplier.amount)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4">Brak danych</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Expense Categories */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Kategorie wydatków</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {data.expenseCategories.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.expenseCategories}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {data.expenseCategories.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        Brak danych o wydatkach
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Costs Comparison */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Porównanie kosztów</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={costData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="realized" name="Poniesione" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="estimated" name="Planowane" fill="#ea580c" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
