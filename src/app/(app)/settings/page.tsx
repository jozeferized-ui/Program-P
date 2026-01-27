import { getEmployees } from "@/actions/employees";
import { getTools } from "@/actions/tools";
import { getCurrentUser } from "@/actions/users";
import { EmployeesManager } from "@/components/management/EmployeesManager";
import { ToolsManager } from "@/components/management/ToolsManager";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { UserManager } from "@/components/admin/UserManager";
import { RoleManager } from "@/components/admin/RoleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const currentUser = await getCurrentUser();

    // Check if user has access to settings
    if (!currentUser || !currentUser.permissions.includes('settings')) {
        redirect('/');
    }

    const employees = await getEmployees();
    const tools = await getTools();

    const canManageUsers = currentUser.permissions.includes('users');
    const canManageRoles = currentUser.permissions.includes('roles');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Ustawienia</h1>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">Ogólne</TabsTrigger>
                    {canManageRoles && <TabsTrigger value="roles">Role</TabsTrigger>}
                    {canManageUsers && <TabsTrigger value="users">Użytkownicy</TabsTrigger>}
                    <TabsTrigger value="employees">Pracownicy</TabsTrigger>
                    <TabsTrigger value="tools">Narzędzia</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                    <GeneralSettings />
                </TabsContent>
                {canManageRoles && (
                    <TabsContent value="roles" className="space-y-4">
                        <RoleManager />
                    </TabsContent>
                )}
                {canManageUsers && (
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
