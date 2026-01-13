import { getEmployees } from "@/actions/employees";
import { getTools } from "@/actions/tools";
import { ManagementTabs } from "@/components/management/ManagementTabs";

export default async function ManagementPage() {
    const employees = await getEmployees();
    const tools = await getTools();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Zarządzanie</h1>
            <ManagementTabs initialEmployees={employees} initialTools={tools} />
        </div>
    );
}
