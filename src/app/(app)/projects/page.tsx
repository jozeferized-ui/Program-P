import { getProjects } from '@/actions/projects';
import { getClients } from '@/actions/clients';
import { getSuppliers } from '@/actions/suppliers';
import { getEmployees } from '@/actions/employees';
import { ProjectsList } from '@/components/projects/ProjectsList';

export default async function ProjectsPage() {
    const projects = await getProjects();
    const clients = await getClients();
    const suppliers = await getSuppliers();
    const employees = await getEmployees();

    return (
        <ProjectsList
            initialProjects={projects}
            clients={clients}
            suppliers={suppliers}
            employees={employees}
        />
    );
}
