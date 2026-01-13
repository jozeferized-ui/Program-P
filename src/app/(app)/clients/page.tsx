import { getClients, getClientCategories } from '@/actions/clients';
import { ClientsList } from '@/components/clients/ClientsList';

export default async function ClientsPage() {
    const clients = await getClients();
    const categories = await getClientCategories();

    return <ClientsList initialClients={clients} categories={categories} />;
}
