import { getProjects } from '@/actions/projects';
import { GanttChart } from '@/components/dashboard/GanttChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default async function GanttPage() {
    const projects = await getProjects();

    // Only include projects with dates
    const projectsWithDates = projects.filter(p => p.startDate || p.endDate);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Harmonogram Gantta</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Oś czasu projektów</CardTitle>
                </CardHeader>
                <CardContent>
                    <GanttChart projects={projectsWithDates} />
                </CardContent>
            </Card>
        </div>
    );
}
