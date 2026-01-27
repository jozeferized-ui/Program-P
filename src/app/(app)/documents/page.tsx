import { getProjects } from '@/actions/projects';
import { getAllTasks } from '@/actions/trash';
import { DocumentsView } from '@/components/documents/DocumentsView';

export default async function DocumentsPage() {
    const [projects, tasks] = await Promise.all([
        getProjects(),
        getAllTasks(),
    ]);

    // Mock files for now
    const files = [
        { id: 1, name: 'Umowa_Wstepna.pdf', type: 'PDF', size: '2.4 MB', date: '2023-10-15' },
        { id: 2, name: 'Projekt_Techniczny.dwg', type: 'DWG', size: '15.8 MB', date: '2023-11-02' },
        { id: 3, name: 'Kosztorys.xlsx', type: 'Excel', size: '45 KB', date: '2023-11-10' },
    ];

    return (
        <DocumentsView
            initialProjects={projects}
            initialTasks={tasks}
            initialFiles={files}
        />
    );
}
