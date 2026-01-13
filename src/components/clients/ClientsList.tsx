'use client';

import { Client, ClientCategory } from '@/types';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { EditClientDialog } from '@/components/clients/EditClientDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Search, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { deleteClient, checkClientHasProjects } from '@/actions/clients';

interface ClientsListProps {
    initialClients: (Client & { category: ClientCategory | null })[];
    categories: ClientCategory[];
}

export function ClientsList({ initialClients, categories }: ClientsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [clientToEdit, setClientToEdit] = useState<(Client & { category: ClientCategory | null }) | null>(null);

    const clients = initialClients;

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDeleteClient = async (clientId: number) => {
        try {
            const hasProjects = await checkClientHasProjects(clientId);
            if (hasProjects) {
                toast.error("Nie można usunąć klienta, który ma przypisane projekty. Najpierw usuń projekty.");
                return;
            }

            if (confirm("Czy na pewno chcesz usunąć tego klienta?")) {
                await deleteClient(clientId);
                toast.success("Klient został przeniesiony do kosza.");
            }
        } catch (error) {
            console.error("Failed to delete client:", error);
            toast.error("Wystąpił błąd podczas usuwania klienta.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Klienci</h1>
                <AddClientDialog categories={categories} />
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Szukaj klienta..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nazwa</TableHead>
                            <TableHead>Kategoria</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Brak klientów. Dodaj pierwszego klienta powyżej.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredClients.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {client.color && (
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-gray-200 shadow-sm"
                                                style={{ backgroundColor: client.color }}
                                                title="Kolor klienta"
                                            />
                                        )}
                                        {client.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {client.category && (
                                        <Badge variant="secondary">
                                            {client.category.name}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {client.email ? (
                                        <a href={`mailto:${client.email}`} className="hover:underline flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> {client.email}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground italic">Brak</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {client.phone ? (
                                        <a href={`tel:${client.phone}`} className="hover:underline flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {client.phone}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground italic">Brak</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Edit2
                                            className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary"
                                            onClick={() => setClientToEdit(client)}
                                        />
                                        <Trash2
                                            className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-destructive"
                                            onClick={() => handleDeleteClient(client.id!)}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {clientToEdit && (
                <EditClientDialog
                    client={clientToEdit}
                    categories={categories}
                    open={!!clientToEdit}
                    onOpenChange={(open) => !open && setClientToEdit(null)}
                />
            )}
        </div>
    );
}
