'use client';


import { AddResourceDialog } from '@/components/resources/AddResourceDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Image as ImageIcon, Link as LinkIcon, ExternalLink, Download, FolderOpen, ChevronRight, Folder } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ResourceGalleryProps {
    projectId: number;
    resources: any[];
}

const FOLDERS = [
    { name: 'Zdjęcia', icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
    { name: 'Dokumenty', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { name: 'Protokoły', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' },
];

export function ResourceGallery({ projectId, resources }: ResourceGalleryProps) {
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);

    const filteredResources = useMemo(() => {
        if (!currentFolder) return [];
        return resources.filter(r => r.folder === currentFolder);
    }, [resources, currentFolder]);

    const folderCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        FOLDERS.forEach(f => {
            counts[f.name] = resources.filter(r => r.folder === f.name).length;
        });
        return counts;
    }, [resources]);

    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

    useEffect(() => {
        const newUrls: Record<number, string> = {};
        resources.forEach(res => {
            if (res.type === 'Image' && res.contentBase64) {
                try {
                    const byteCharacters = atob(res.contentBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'image/jpeg' });
                    newUrls[res.id] = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Failed to convert base64 to blob", e);
                }
            }
        });
        setImageUrls(newUrls);

        return () => {
            Object.values(newUrls).forEach(url => URL.revokeObjectURL(url));
        };
    }, [resources]);

    const handleDownload = (resource: any) => {
        if (resource.contentBase64) {
            try {
                const byteCharacters = atob(resource.contentBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = resource.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error("Download failed", e);
            }
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("p-0 hover:bg-transparent font-semibold text-lg", currentFolder && "text-muted-foreground font-normal")}
                        onClick={() => setCurrentFolder(null)}
                    >
                        <FolderOpen className="h-5 w-5 mr-2" />
                        Zasoby Projektu
                    </Button>
                    {currentFolder && (
                        <>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-lg font-semibold">{currentFolder}</span>
                        </>
                    )}
                </div>
                {currentFolder && (
                    <AddResourceDialog projectId={projectId} defaultFolder={currentFolder} />
                )}
            </CardHeader>
            <CardContent>
                {!currentFolder ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {FOLDERS.map((folder) => (
                            <Card
                                key={folder.name}
                                className="cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => setCurrentFolder(folder.name)}
                            >
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                                    <div className={cn("p-4 rounded-full", folder.bg, folder.color)}>
                                        <folder.icon className="h-8 w-8" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold">{folder.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {folderCounts?.[folder.name] || 0} plików
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {filteredResources.map((resource) => (
                            <Card key={resource.id} className="overflow-hidden border shadow-sm">
                                {resource.type === 'Image' && imageUrls[resource.id] ? (
                                    <div className="aspect-video relative bg-gray-100 dark:bg-gray-800 group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageUrls[resource.id]}
                                            alt={resource.name}
                                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-video flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-muted-foreground p-4 gap-2">
                                        {resource.type === 'Link' && (
                                            <>
                                                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                    <LinkIcon className="h-8 w-8" />
                                                </div>
                                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Link</span>
                                            </>
                                        )}
                                        {resource.type === 'File' && (
                                            <>
                                                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                                    <FileText className="h-8 w-8" />
                                                </div>
                                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dokument</span>
                                            </>
                                        )}
                                        {resource.type === 'Image' && !imageUrls[resource.id] && (
                                            <ImageIcon className="h-10 w-10 animate-pulse" />
                                        )}
                                    </div>
                                )}

                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-medium truncate flex-1" title={resource.name}>
                                            {resource.name}
                                        </div>
                                        {resource.type === 'Link' && resource.contentUrl && (
                                            <a
                                                href={resource.contentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-700"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                        {(resource.type === 'File' || resource.type === 'Image') && resource.contentBase64 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleDownload(resource)}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {resource.type === 'Link' ? 'Link' : resource.type === 'Image' ? 'Zdjęcie' : 'Plik'}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredResources.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground">
                                Ten folder jest pusty.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
