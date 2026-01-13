import { getProject } from '@/actions/projects';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { AddProjectDialog } from '@/components/projects/AddProjectDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { FinanceOverview } from '@/components/finances/FinanceOverview';
import { ResourceGallery } from '@/components/resources/ResourceGallery';
import { QuotationManager } from '@/components/projects/QuotationManager';
import { OrdersManager } from '@/components/projects/OrdersManager';
import { CostEstimationManager } from '@/components/projects/CostEstimationManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { getTasks } from '@/actions/tasks';
import { getClients } from '@/actions/clients';
import { getSuppliers } from '@/actions/suppliers';
import { getEmployees } from '@/actions/employees';
import { getProjects } from '@/actions/projects';

import { getExpenses } from '@/actions/expenses';
import { getCostEstimates } from '@/actions/costEstimates';
import { getResources } from '@/actions/resources';
import { getQuotationItems } from '@/actions/quotations';

import { getOrders } from '@/actions/orders';
import { getOrderTemplates } from '@/actions/orderTemplates';

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const projectId = parseInt(id);
    const project = await getProject(projectId);
    const tasks = await getTasks(projectId);
    const expenses = await getExpenses(projectId);
    const costEstimates = await getCostEstimates(projectId);
    const resources = await getResources(projectId);
    const quotationItems = await getQuotationItems(projectId);
    const orders = await getOrders(projectId);
    const orderTemplates = await getOrderTemplates();

    // Fetch auxiliary data for dialogs if needed
    const clients = await getClients();
    const suppliers = await getSuppliers();
    const employees = await getEmployees();
    const projects = await getProjects();

    if (!project) {
        return <div className="p-8 text-center">Projekt nie znaleziony.</div>;
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-6">
                <ProjectHeader project={project} />

                <Tabs defaultValue={project.status === 'To Quote' ? 'quotation' : 'tasks'} className="w-full">
                    <TabsList className="w-full justify-start gap-2 h-auto p-1 overflow-x-auto">
                        <TabsTrigger value="tasks">Zadania</TabsTrigger>
                        <TabsTrigger value="subprojects">Podprojekty</TabsTrigger>
                        <TabsTrigger value="quotation">Oferta</TabsTrigger>
                        <TabsTrigger value="cost-estimation">Wycena kosztów</TabsTrigger>
                        <TabsTrigger value="orders">Zamówienia</TabsTrigger>
                        <TabsTrigger value="expenses">Koszty</TabsTrigger>
                        <TabsTrigger value="resources">Zasoby</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tasks" className="mt-6">
                        <TaskBoard
                            projectId={projectId}
                            initialTasks={tasks}
                            initialOrders={orders}
                            project={project}
                            orderTemplates={orderTemplates}
                        />
                    </TabsContent>

                    <TabsContent value="subprojects" className="mt-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Podprojekty (Etapy)</h2>
                                <AddProjectDialog
                                    defaultParentId={projectId}
                                    defaultParentName={project.name}
                                    clients={clients}
                                    suppliers={suppliers}
                                    employees={employees}
                                    projects={projects}
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {project.subProjects?.map((subproject) => (
                                    <Link href={`/projects/${subproject.id}`} key={subproject.id}>
                                        <Card className={cn(
                                            "transition-all cursor-pointer h-full border-2",
                                            subproject.status === 'Active' && "border-green-500/50 bg-green-50/50 dark:bg-green-900/20 hover:border-green-500 hover:bg-green-100/50 dark:hover:bg-green-900/30",
                                            subproject.status === 'Completed' && "border-red-500/50 bg-red-50/50 dark:bg-red-900/20 hover:border-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30",
                                            subproject.status === 'On Hold' && "border-orange-500/50 bg-orange-50/50 dark:bg-orange-900/20 hover:border-orange-500 hover:bg-orange-100/50 dark:hover:bg-orange-900/30",
                                            subproject.status === 'To Quote' && "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100/50 dark:hover:bg-blue-900/30",
                                            !['Active', 'Completed', 'On Hold', 'To Quote'].includes(subproject.status) && "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        )}>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-base font-medium truncate pr-2">
                                                    {subproject.name}
                                                </CardTitle>
                                                <Badge className={cn(
                                                    subproject.status === 'Active' && "bg-green-600 hover:bg-green-700",
                                                    subproject.status === 'Completed' && "bg-red-600 hover:bg-red-700",
                                                    subproject.status === 'On Hold' && "bg-orange-600 hover:bg-orange-700",
                                                    subproject.status === 'To Quote' && "bg-blue-600 hover:bg-blue-700",
                                                    !['Active', 'Completed', 'On Hold', 'To Quote'].includes(subproject.status) && "bg-gray-500 hover:bg-gray-600"
                                                )}>
                                                    {subproject.status === 'Active' ? 'Aktywny' :
                                                        subproject.status === 'Completed' ? 'Zakończony' :
                                                            subproject.status === 'On Hold' ? 'Wstrzymany' :
                                                                subproject.status === 'To Quote' ? 'Do Wyceny' : subproject.status}
                                                </Badge>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4" />
                                                        <span>{subproject.totalValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>
                                                            {subproject.endDate ? format(new Date(subproject.endDate), 'd MMM yyyy', { locale: pl }) : 'Brak daty'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                                {project.subProjects?.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-muted-foreground">
                                        Brak podprojektów.
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="quotation" className="mt-6">
                        <QuotationManager projectId={projectId} items={quotationItems} project={project} />
                    </TabsContent>

                    <TabsContent value="cost-estimation" className="mt-6">
                        <CostEstimationManager projectId={projectId} initialItems={costEstimates} />
                    </TabsContent>

                    <TabsContent value="orders" className="mt-6">
                        <OrdersManager projectId={projectId} initialOrders={orders} suppliers={suppliers} />
                    </TabsContent>

                    <TabsContent value="expenses" className="mt-6">
                        <FinanceOverview
                            projectId={projectId}
                            projectValue={project.totalValue}
                            expenses={expenses}
                            costEstimates={costEstimates}
                        />
                    </TabsContent>

                    <TabsContent value="resources" className="mt-6">
                        <ResourceGallery projectId={projectId} resources={resources} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
