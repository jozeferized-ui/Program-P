import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProjects } from '@/actions/projects';
import { getAllTasks } from '@/actions/trash';
import { getAllOrders } from '@/actions/orders';
import { CalendarView } from '@/components/calendar/CalendarView';

export default async function CalendarPage() {
    const [tasks, projects, orders] = await Promise.all([
        getAllTasks(),
        getProjects(),
        getAllOrders(),
    ]);

    return (
        <CalendarView
            initialTasks={tasks}
            initialProjects={projects}
            initialOrders={orders}
        />
    );
}
