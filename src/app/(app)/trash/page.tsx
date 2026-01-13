import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDeletedItems } from '@/actions/trash';
import { TrashItemCard } from '@/components/trash/TrashItemCard';

export default async function TrashPage() {
    const { projects, clients, suppliers, orders } = await getDeletedItems();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">Kosz</h1>

            <Tabs defaultValue="projects">
                <TabsList>
                    <TabsTrigger value="projects">Projekty ({projects.length})</TabsTrigger>
                    <TabsTrigger value="clients">Klienci ({clients.length})</TabsTrigger>
                    <TabsTrigger value="suppliers">Dostawcy ({suppliers.length})</TabsTrigger>
                    <TabsTrigger value="orders">Zamówienia ({orders.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="projects" className="mt-4">
                    {projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Kosz projektów jest pusty</div>
                    ) : (
                        projects.map(project => (
                            <TrashItemCard key={project.id} item={project} table="project" />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="clients" className="mt-4">
                    {clients.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Kosz klientów jest pusty</div>
                    ) : (
                        clients.map(client => (
                            <TrashItemCard key={client.id} item={client} table="client" />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="suppliers" className="mt-4">
                    {suppliers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Kosz dostawców jest pusty</div>
                    ) : (
                        suppliers.map(supplier => (
                            <TrashItemCard key={supplier.id} item={supplier} table="supplier" />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                    {orders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Kosz zamówień jest pusty</div>
                    ) : (
                        orders.map(order => (
                            <TrashItemCard key={order.id} item={order} table="order" />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
