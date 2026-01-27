import { getSupplierById, getSupplierCategories } from '@/actions/suppliers';
import { getAllOrders } from '@/actions/orders';
import { getProjects } from '@/actions/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin, Truck, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { EditSupplierDialog } from '@/components/suppliers/EditSupplierDialog';
import { SupplierDeleteButton } from '@/components/suppliers/SupplierDeleteButton';
import Link from 'next/link';

export default async function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supplierId = parseInt(id);

    const [supplier, categories, allOrders, projects] = await Promise.all([
        getSupplierById(supplierId),
        getSupplierCategories(),
        getAllOrders(),
        getProjects()
    ]);

    if (!supplier) {
        return <div className="p-8 text-center">Dostawca nie znaleziony.</div>;
    }

    const category = categories.find(c => c.id === supplier.categoryId);
    const orders = allOrders
        .filter(o => o.supplierId === supplierId)
        .map(order => ({
            ...order,
            projectName: projects.find(p => p.id === order.projectId)?.name || 'Nieznany projekt'
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalOrdered = orders.reduce((sum, order) => sum + order.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/suppliers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
                    {category && <Badge variant="secondary">{category.name}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                    <EditSupplierDialog supplier={supplier} />
                    <SupplierDeleteButton supplierId={supplierId} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Dane Dostawcy
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {supplier.contactPerson && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Osoba kontaktowa</div>
                                <div>{supplier.contactPerson}</div>
                            </div>
                        )}
                        {supplier.email && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Email</div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
                                </div>
                            </div>
                        )}
                        {supplier.phone && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Telefon</div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                                </div>
                            </div>
                        )}
                        {supplier.address && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Adres</div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{supplier.address}</span>
                                </div>
                            </div>
                        )}
                        {supplier.website && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Strona WWW</div>
                                <a
                                    href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {supplier.website}
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        )}
                        {supplier.notes && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Notatki</div>
                                <p className="text-sm italic mt-1">{supplier.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Historia Zamówień
                        </CardTitle>
                        <div className="text-lg font-bold text-blue-600">
                            Suma: {totalOrdered.toFixed(2)} PLN
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Projekt</TableHead>
                                    <TableHead>Nazwa Zamówienia</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Kwota</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{format(new Date(order.date), 'dd.MM.yyyy')}</TableCell>
                                        <TableCell className="font-medium">{order.projectName}</TableCell>
                                        <TableCell>{order.title}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${order.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                order.status === 'Ordered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                }`}>
                                                {order.status === 'Delivered' ? 'Dostarczone' :
                                                    order.status === 'Ordered' ? 'Zamówione' : 'Oczekujące'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {order.amount.toFixed(2)} PLN
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {orders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            Brak historii zamówień u tego dostawcy.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
