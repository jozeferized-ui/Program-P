import { getFinancialStats } from '@/actions/finances';
import FinancesClient from '@/components/finances/FinancesClient';

export default async function FinancesPage() {
    const data = await getFinancialStats();

    return <FinancesClient data={data} />;
}

