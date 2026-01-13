'use client';

import { useState } from 'react';
import { db } from '@/lib/db';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Moon, Sun, Laptop, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function GeneralSettings() {
    const { theme, setTheme } = useTheme();

    const [isMigrating, setIsMigrating] = useState(false);

    const handleExport = async () => {
        try {
            const { exportDB } = await import('dexie-export-import');
            const blob = await exportDB(db, { prettyJson: true });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-program-p-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Eksport zakończony pomyślnie.");
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Eksport nie powiódł się.");
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("UWAGA: Import nadpisze wszystkie obecne dane. Czy na pewno chcesz kontynuować?")) {
            event.target.value = '';
            return;
        }

        try {
            await db.delete();
            await db.open();
            const { importInto } = await import('dexie-export-import');
            await importInto(db, file, {
                clearTablesBeforeImport: true,
            });
            toast.success("Import zakończony pomyślnie. Odświeżam stronę...");
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Import failed:", error);
            toast.error("Import nie powiódł się.");
        } finally {
            event.target.value = '';
        }
    };

    const handleMigrateToServer = async () => {
        if (!confirm("Czy na pewno chcesz przenieść dane na serwer? Ta operacja nadpisze dane na serwerze danymi z przeglądarki.")) {
            return;
        }

        setIsMigrating(true);
        try {
            const { migrateData } = await import('@/actions/migration');

            // Read all data from Dexie
            const clients = await db.clients.toArray();
            const projects = await db.projects.toArray();
            const tasks = await db.tasks.toArray();
            const expenses = await db.expenses.toArray();
            const resources = await db.resources.toArray();
            const suppliers = await db.suppliers.toArray();
            const quotationItems = await db.quotationItems.toArray();
            const orders = await db.orders.toArray();
            const orderTemplates = await db.orderTemplates.toArray();
            const clientCategories = await db.clientCategories.toArray();
            const supplierCategories = await db.supplierCategories.toArray();
            const costEstimates = await db.costEstimates.toArray();
            const notifications = await db.notifications.toArray();
            const employees = await db.employees.toArray();
            const tools = await db.tools.toArray();
            const warehouseItems = await db.warehouseItems.toArray();
            const warehouseHistory = await db.warehouseHistory.toArray();

            const result = await migrateData({
                clients, projects, tasks, expenses, resources, suppliers,
                quotationItems, orders, orderTemplates, clientCategories,
                supplierCategories, costEstimates, notifications, employees,
                tools, warehouseItems, warehouseHistory
            });

            if (result.success) {
                toast.success("Migracja na serwer zakończona sukcesem!");
            } else {
                toast.error(`Błąd migracji: ${result.error}`);
            }
        } catch (error) {
            console.error("Migration failed:", error);
            toast.error("Wystąpił błąd podczas migracji.");
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Moon className="h-5 w-5" />
                        Wygląd
                    </CardTitle>
                    <CardDescription>
                        Dostosuj wygląd aplikacji do swoich preferencji.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Motyw</Label>
                            <p className="text-sm text-muted-foreground">
                                Wybierz jasny lub ciemny motyw.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 border rounded-lg p-1">
                            <Button
                                variant={theme === 'light' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setTheme('light')}
                                className="gap-2"
                            >
                                <Sun className="h-4 w-4" />
                                Jasny
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setTheme('dark')}
                                className="gap-2"
                            >
                                <Moon className="h-4 w-4" />
                                Ciemny
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setTheme('system')}
                                className="gap-2"
                            >
                                <Laptop className="h-4 w-4" />
                                System
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Zarządzanie Danymi
                    </CardTitle>
                    <CardDescription>
                        Pobierz kopię zapasową swoich danych, przywróć dane z pliku lub przenieś je na serwer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleExport} className="flex-1 gap-2">
                            <Download className="h-4 w-4" />
                            Eksportuj Bazę Danych
                        </Button>
                        <div className="flex-1 relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <Button variant="outline" className="w-full gap-2">
                                <Upload className="h-4 w-4" />
                                Importuj Bazę Danych
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <Button
                            onClick={handleMigrateToServer}
                            disabled={isMigrating}
                            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Database className="h-4 w-4" />
                            {isMigrating ? 'Trwa przenoszenie danych...' : 'Przenieś dane na serwer (Migracja)'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            Ta operacja pobierze wszystkie dane z przeglądarki i zapisze je w bazie danych serwera.
                        </p>
                    </div>

                    <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-medium">Uwaga dotycząca importu</p>
                                <p>Import danych całkowicie nadpisze obecną bazę danych. Upewnij się, że masz kopię zapasową przed wykonaniem tej operacji.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
