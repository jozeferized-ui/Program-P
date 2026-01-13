'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Check, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getRoles, createRole, updateRole, deleteRole, type RoleData } from '@/actions/roles';
import { ALL_PERMISSIONS, getPermissionsByCategory } from '@/lib/permissions';

export function RoleManager() {
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleData | null>(null);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setLoading(true);
        const data = await getRoles();
        setRoles(data);
        setLoading(false);
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
                <h2 className="text-2xl font-bold">Role i uprawnienia</h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nowa rola
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nowa rola</DialogTitle>
                        </DialogHeader>
                        <RoleForm
                            onSubmit={async (data) => {
                                const result = await createRole(data);
                                if (result.success) {
                                    toast.success('Rola utworzona');
                                    setIsAddOpen(false);
                                    loadRoles();
                                } else {
                                    toast.error(result.error);
                                }
                            }}
                            onCancel={() => setIsAddOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Roles List */}
            <div className="grid gap-4">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <h3 className="font-semibold text-lg">{role.name}</h3>
                                    {role.isSystem && (
                                        <Badge variant="outline" className="text-xs">Systemowa</Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                        <Users className="w-3 h-3 mr-1" />
                                        {role.userCount} użytkowników
                                    </Badge>
                                </div>
                                {role.description && (
                                    <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions.map((permId) => {
                                        const perm = ALL_PERMISSIONS.find(p => p.id === permId);
                                        return (
                                            <Badge key={permId} variant="outline" className="text-xs">
                                                {perm?.label || permId}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setEditingRole(role)}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                {!role.isSystem && role.userCount === 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={async () => {
                                            const result = await deleteRole(role.id);
                                            if (result.success) {
                                                toast.success('Rola usunięta');
                                                loadRoles();
                                            } else {
                                                toast.error(result.error);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edytuj rolę: {editingRole?.name}</DialogTitle>
                    </DialogHeader>
                    {editingRole && (
                        <RoleForm
                            initialData={editingRole}
                            isSystem={editingRole.isSystem}
                            onSubmit={async (data) => {
                                const result = await updateRole(editingRole.id, data);
                                if (result.success) {
                                    toast.success('Rola zaktualizowana');
                                    setEditingRole(null);
                                    loadRoles();
                                } else {
                                    toast.error(result.error);
                                }
                            }}
                            onCancel={() => setEditingRole(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RoleForm({
    initialData,
    isSystem = false,
    onSubmit,
    onCancel,
}: {
    initialData?: RoleData;
    isSystem?: boolean;
    onSubmit: (data: { name: string; description?: string; permissions: string[] }) => Promise<void>;
    onCancel: () => void;
}) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [permissions, setPermissions] = useState<string[]>(initialData?.permissions || []);
    const [isPending, setIsPending] = useState(false);

    const permissionsByCategory = getPermissionsByCategory();

    const togglePermission = (permId: string) => {
        setPermissions((prev) =>
            prev.includes(permId)
                ? prev.filter((p) => p !== permId)
                : [...prev, permId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        await onSubmit({ name, description, permissions });
        setIsPending(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">Nazwa roli</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSystem}
                        required
                    />
                    {isSystem && (
                        <p className="text-xs text-muted-foreground mt-1">Nazwa roli systemowej nie może być zmieniona</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="description">Opis (opcjonalny)</Label>
                    <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <Label>Uprawnienia (dostęp do zakładek)</Label>

                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">{category}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {perms.map((perm) => (
                                <label
                                    key={perm.id}
                                    className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <Checkbox
                                        checked={permissions.includes(perm.id)}
                                        onCheckedChange={() => togglePermission(perm.id)}
                                    />
                                    <span className="text-sm">{perm.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Anuluj
                </Button>
                <Button type="submit" disabled={isPending || !name || permissions.length === 0}>
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Zapisywanie...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            {initialData ? 'Zapisz zmiany' : 'Utwórz rolę'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
