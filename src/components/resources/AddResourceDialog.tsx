'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { createResource } from '@/actions/resources';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Nazwa zasobu musi mieć co najmniej 2 znaki.",
    }),
    type: z.enum(['File', 'Image', 'Link']),
    content: z.string().optional(), // For Link URL
    folder: z.string().optional(),
});

interface AddResourceDialogProps {
    projectId: number;
    defaultFolder?: string;
}

export function AddResourceDialog({ projectId, defaultFolder }: AddResourceDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: "Link",
            content: "",
            folder: defaultFolder || "Dokumenty",
        },
    });

    // Update default folder when prop changes
    useEffect(() => {
        if (defaultFolder) {
            form.setValue('folder', defaultFolder);
        }
    }, [defaultFolder, form]);

    const type = form.watch("type");

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const formData = new FormData();
            formData.append('projectId', projectId.toString());
            formData.append('name', values.name);
            formData.append('type', values.type);
            formData.append('folder', values.folder || '');
            if (values.content) formData.append('contentUrl', values.content);
            if (file) formData.append('file', file);

            await createResource(formData);
            toast.success("Zasób dodany pomyślnie.");
            setOpen(false);
            form.reset({
                name: "",
                type: "Link",
                content: "",
                folder: defaultFolder || "Dokumenty",
            });
            setFile(null);
        } catch (error) {
            console.error("Failed to add resource:", error);
            toast.error("Błąd dodawania zasobu.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj Zasób
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Dodaj Zasób</DialogTitle>
                    <DialogDescription>
                        Dodaj plik, zdjęcie lub link do folderu {defaultFolder ? <strong>{defaultFolder}</strong> : "projektu"}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nazwa</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Faktura, Projekt..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!defaultFolder && (
                            <FormField
                                control={form.control}
                                name="folder"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Folder</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wybierz folder" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Zdjęcia">Zdjęcia</SelectItem>
                                                <SelectItem value="Dokumenty">Dokumenty</SelectItem>
                                                <SelectItem value="Protokoły">Protokoły</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Typ</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setFile(null);
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz typ" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Link">Link / URL</SelectItem>
                                            <SelectItem value="Image">Zdjęcie</SelectItem>
                                            <SelectItem value="File">Plik</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {type === 'Link' ? (
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormItem>
                                <FormLabel>Plik</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            accept={type === 'Image' ? "image/*" : "*"}
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </FormControl>
                                {file && <p className="text-xs text-muted-foreground">Wybrano: {file.name}</p>}
                            </FormItem>
                        )}

                        <DialogFooter>
                            <Button type="submit">Zapisz</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
