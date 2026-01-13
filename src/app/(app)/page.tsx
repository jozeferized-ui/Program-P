import { getDashboardStats } from '@/actions/dashboard';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function Dashboard() {
  const stats = await getDashboardStats();

  return <DashboardClient stats={stats} />;
}
