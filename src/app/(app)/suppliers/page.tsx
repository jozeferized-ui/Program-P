import { getSuppliers, getSupplierCategories } from '@/actions/suppliers';
import { getAllOrders } from '@/actions/orders';
import { getProjects } from '@/actions/projects';
import { AddSupplierDialog } from '@/components/suppliers/AddSupplierDialog';
import { SuppliersList } from '@/components/suppliers/SuppliersList';

export default async function SuppliersPage() {
    const [suppliers, categories, orders, projects] = await Promise.all([
        getSuppliers(),
        getSupplierCategories(),
        getAllOrders(),
        getProjects()
    ]);

    // Process data for the list
    const processedSuppliers = suppliers.map(supplier => {
        // Find orders for this supplier
        const supplierOrders = orders.filter(o => o.supplierId === supplier.id) || [];

        // Find the last order (sorted by date descending)
        const lastOrder = supplierOrders.sort((a, b) => b.date.getTime() - a.date.getTime())[0];

        // Find the project for the last order
        const lastProject = lastOrder ? projects.find(p => p.id === lastOrder.projectId) : undefined;

        return {
            ...supplier,
            lastOrder,
            lastProject,
            categoryName: categories.find(cat => cat.id === supplier.categoryId)?.name
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dostawcy</h1>
                <AddSupplierDialog />
            </div>

            <SuppliersList initialSuppliers={processedSuppliers} />
        </div>
    );
}
