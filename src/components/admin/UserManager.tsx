'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Edit2, KeyRound, Check, X, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUsers, createUser, updateUser, resetUserPassword, type UserData } from '@/actions/users';
import { getRoles, type RoleData } from '@/actions/roles';

export function UserManager() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<UserData | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
        setUsers(usersData);
        setRoles(rolesData);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddUser = async (formData: FormData) => {
        const result = await createUser({
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            roleId: parseInt(formData.get('roleId') as string),
        });

        if (result.success) {
            toast.success('Użytkownik utworzony');
            setIsAddOpen(false);
            loadData();
        } else {
            toast.error(result.error);
        }
    };

    const handleUpdateUser = async (formData: FormData) => {
        if (!editingUser) return;

        const result = await updateUser(editingUser.id, {
            email: formData.get('email') as string,
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            roleId: parseInt(formData.get('roleId') as string),
            isActive: formData.get('isActive') === 'true',
        });

        if (result.success) {
            toast.success('Użytkownik zaktualizowany');
            setEditingUser(null);
            loadData();
        } else {
            toast.error(result.error);
        }
    };

    const handleResetPassword = async (formData: FormData) => {
        if (!resetPasswordUser) return;

        const result = await resetUserPassword(
            resetPasswordUser.id,
            formData.get('newPassword') as string
        );

        if (result.success) {
            toast.success('Hasło zmienione');
            setResetPasswordUser(null);
        } else {
            toast.error(result.error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Użytkownicy</h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Dodaj użytkownika
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nowy użytkownik</DialogTitle>
                        </DialogHeader>
                        <form action={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">Imię</Label>
                                    <Input id="firstName" name="firstName" required />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Nazwisko</Label>
                                    <Input id="lastName" name="lastName" required />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" required />
                            </div>
                            <div>
                                <Label htmlFor="password">Hasło</Label>
                                <Input id="password" name="password" type="password" required minLength={6} />
                            </div>
                            <div>
                                <Label htmlFor="roleId">Rola</Label>
                                <Select name="roleId" defaultValue={roles.find(r => r.name === 'Użytkownik')?.id?.toString() || roles[0]?.id?.toString()}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                                    Anuluj
                                </Button>
                                <Button type="submit">Utwórz</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* User List */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Użytkownik</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Rola</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-muted/30">
                                <td className="px-4 py-3">
                                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className="gap-1">
                                        <Shield className="w-3 h-3" />
                                        {user.roleName}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    {user.isActive ? (
                                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                                            <Check className="w-3 h-3 mr-1" />
                                            Aktywny
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                                            <X className="w-3 h-3 mr-1" />
                                            Nieaktywny
                                        </Badge>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setResetPasswordUser(user)}>
                                            <KeyRound className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edytuj użytkownika</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <form action={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="editFirstName">Imię</Label>
                                    <Input id="editFirstName" name="firstName" defaultValue={editingUser.firstName} required />
                                </div>
                                <div>
                                    <Label htmlFor="editLastName">Nazwisko</Label>
                                    <Input id="editLastName" name="lastName" defaultValue={editingUser.lastName} required />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="editEmail">Email</Label>
                                <Input id="editEmail" name="email" type="email" defaultValue={editingUser.email} required />
                            </div>
                            <div>
                                <Label htmlFor="editRoleId">Rola</Label>
                                <Select name="roleId" defaultValue={editingUser.roleId.toString()}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="editStatus">Status</Label>
                                <Select name="isActive" defaultValue={String(editingUser.isActive)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Aktywny</SelectItem>
                                        <SelectItem value="false">Nieaktywny</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                    Anuluj
                                </Button>
                                <Button type="submit">Zapisz</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zmień hasło: {resetPasswordUser?.firstName} {resetPasswordUser?.lastName}</DialogTitle>
                    </DialogHeader>
                    <form action={handleResetPassword} className="space-y-4">
                        <div>
                            <Label htmlFor="newPassword">Nowe hasło</Label>
                            <Input id="newPassword" name="newPassword" type="password" required minLength={6} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>
                                Anuluj
                            </Button>
                            <Button type="submit">Zmień hasło</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
