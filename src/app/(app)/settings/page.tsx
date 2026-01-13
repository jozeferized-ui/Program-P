import { getEmployees } from "@/actions/employees";
import { getTools } from "@/actions/tools";
import { getCurrentUser } from "@/actions/users";
import { EmployeesManager } from "@/components/management/EmployeesManager";
import { ToolsManager } from "@/components/management/ToolsManager";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { UserManager } from "@/components/admin/UserManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const currentUser = await getCurrentUser();

    // Check if user is admin/manager
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
        redirect('/');
    }

    const employees = await getEmployees();
    const tools = await getTools();
    const isAdmin = currentUser.role === 'ADMIN';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Ustawienia</h1>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">Ogólne</TabsTrigger>
                    {isAdmin && <TabsTrigger value="users">Użytkownicy</TabsTrigger>}
                    <TabsTrigger value="employees">Pracownicy</TabsTrigger>
                    <TabsTrigger value="tools">Narzędzia</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                    <GeneralSettings />
                </TabsContent>
                {isAdmin && (
                    <TabsContent value="users" className="space-y-4">
                        <UserManager />
                    </TabsContent>
                )}
                <TabsContent value="employees" className="space-y-4">
                    <EmployeesManager initialEmployees={employees} />
                </TabsContent>
                <TabsContent value="tools" className="space-y-4">
                    <ToolsManager initialTools={tools} initialEmployees={employees} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
